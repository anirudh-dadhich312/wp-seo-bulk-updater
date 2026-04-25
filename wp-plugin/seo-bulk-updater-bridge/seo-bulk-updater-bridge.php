<?php
/**
 * Plugin Name: SEO Bulk Updater Bridge
 * Plugin URI:  https://example.com/seo-bulk-updater
 * Description: Exposes Yoast / RankMath / AIOSEO meta fields via the WordPress REST API so they can be bulk-updated remotely from the SEO Bulk Updater dashboard.
 * Version:     1.2.0
 * Author:      SEO Bulk Updater
 * License:     GPL-2.0-or-later
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Register all known SEO plugin meta keys against every public post type
 * so they're readable / writable through /wp-json/wp/v2/{type}/{id}.
 *
 * Without this, WordPress hides custom meta from the REST API and the
 * dashboard would not be able to push updates remotely.
 */
add_action('rest_api_init', function () {
    $fields = [
        // Yoast SEO
        '_yoast_wpseo_title',
        '_yoast_wpseo_metadesc',
        // Rank Math
        'rank_math_title',
        'rank_math_description',
        // All in One SEO (legacy meta keys — works on AIOSEO < 4 and any plugin
        // that mirrors meta to post_meta. AIOSEO 4+ stores in its own table;
        // see README for the AIOSEO compatibility note.)
        '_aioseo_title',
        '_aioseo_description',
        // Generic fallback
        '_seo_title',
        '_seo_description',
    ];

    $post_types = get_post_types(['public' => true], 'names');

    foreach ($post_types as $type) {
        foreach ($fields as $field) {
            register_post_meta($type, $field, [
                'show_in_rest'  => true,
                'single'        => true,
                'type'          => 'string',
                'auth_callback' => function () {
                    return current_user_can('edit_posts');
                },
            ]);
        }
    }
});

/**
 * Expose Rank Math SEO data via a dedicated REST field.
 * Writing through this field calls update_post_meta directly and fires
 * Rank Math's own hooks so its object cache is properly invalidated.
 */
add_action('rest_api_init', function () {
    if (!defined('RANK_MATH_VERSION')) {
        return;
    }

    $post_types = get_post_types(['public' => true], 'names');

    register_rest_field($post_types, 'rankmath', [
        'get_callback' => function ($post) {
            return [
                'title'       => (string) get_post_meta($post['id'], 'rank_math_title', true),
                'description' => (string) get_post_meta($post['id'], 'rank_math_description', true),
            ];
        },
        'update_callback' => function ($value, $post) {
            if (!current_user_can('edit_post', $post->ID)) {
                return new WP_Error('rest_forbidden', 'Insufficient permissions', ['status' => 403]);
            }
            if (isset($value['title'])) {
                update_post_meta($post->ID, 'rank_math_title', sanitize_text_field($value['title']));
            }
            if (isset($value['description'])) {
                update_post_meta($post->ID, 'rank_math_description', sanitize_text_field($value['description']));
            }
            // Bust Rank Math's object cache so the updated values are picked up immediately
            wp_cache_delete('rank_math_post_meta_' . $post->ID);
            do_action('rank_math/post/update_meta', $post->ID, [], []);
            return true;
        },
        'schema' => [
            'type' => 'object',
            'properties' => [
                'title'       => ['type' => 'string'],
                'description' => ['type' => 'string'],
            ],
        ],
    ]);
});

/**
 * Expose AIOSEO v4+ data via a virtual REST field.
 *
 * AIOSEO 4+ stores SEO data in its own `wp_aioseo_posts` custom table, NOT in
 * wp_postmeta. The previously used aioseo()->helpers->getPost() helper does not
 * return a writable/saveable object in AIOSEO 4.9+, so writes were silently lost
 * while still returning a 200 OK response.
 *
 * Fix: read and write directly via $wpdb against the aioseo_posts table.
 * This is version-agnostic and is exactly what AIOSEO's own code does internally.
 * Falls back to legacy post meta for sites still on AIOSEO < 4.
 */
add_action('rest_api_init', function () {
    // Guard: only register if AIOSEO is active
    if (!function_exists('aioseo') && !defined('AIOSEO_VERSION')) {
        return;
    }

    $post_types = get_post_types(['public' => true], 'names');

    register_rest_field($post_types, 'aioseo', [

        // ── READ ────────────────────────────────────────────────────────────
        'get_callback' => function ($post) {
            global $wpdb;
            $post_id = (int) $post['id'];
            $table   = $wpdb->prefix . 'aioseo_posts';

            // AIOSEO 4+: read from custom table
            if ($wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table)) === $table) {
                $row = $wpdb->get_row(
                    $wpdb->prepare("SELECT title, description FROM `{$table}` WHERE post_id = %d LIMIT 1", $post_id)
                );
                if ($row) {
                    return [
                        'title'       => (string) ($row->title       ?? ''),
                        'description' => (string) ($row->description ?? ''),
                    ];
                }
                // Row doesn't exist yet — return empty (will be inserted on first write)
                return ['title' => '', 'description' => ''];
            }

            // AIOSEO < 4: legacy post meta fallback
            return [
                'title'       => (string) get_post_meta($post_id, '_aioseo_title',       true),
                'description' => (string) get_post_meta($post_id, '_aioseo_description', true),
            ];
        },

        // ── WRITE ───────────────────────────────────────────────────────────
        'update_callback' => function ($value, $post) {
            if (!current_user_can('edit_post', $post->ID)) {
                return new WP_Error('rest_forbidden', 'Insufficient permissions', ['status' => 403]);
            }

            global $wpdb;
            $post_id = (int) $post->ID;
            $table   = $wpdb->prefix . 'aioseo_posts';

            $title = isset($value['title'])       ? sanitize_text_field($value['title'])       : null;
            $desc  = isset($value['description']) ? sanitize_text_field($value['description']) : null;

            // AIOSEO 4+: write directly to wp_aioseo_posts
            if ($wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table)) === $table) {
                $exists = $wpdb->get_var(
                    $wpdb->prepare("SELECT id FROM `{$table}` WHERE post_id = %d LIMIT 1", $post_id)
                );

                $data   = ['updated' => current_time('mysql')];
                $format = ['%s'];

                if ($title !== null) { $data['title']       = $title; $format[] = '%s'; }
                if ($desc  !== null) { $data['description'] = $desc;  $format[] = '%s'; }

                if ($exists) {
                    $wpdb->update($table, $data, ['post_id' => $post_id], $format, ['%d']);
                } else {
                    $data['post_id'] = $post_id;
                    $data['created'] = current_time('mysql');
                    $format[]        = '%d';
                    $format[]        = '%s';
                    $wpdb->insert($table, $data, $format);
                }

                // Bust AIOSEO's object cache so the new values are served immediately
                wp_cache_delete("aioseo_post_{$post_id}");
                wp_cache_delete("aioseo_post_meta_{$post_id}");
                if (function_exists('aioseo') && isset(aioseo()->cache)) {
                    // Belt-and-suspenders: also clear via AIOSEO's cache object if available
                    try { aioseo()->cache->delete("post_{$post_id}"); } catch (\Throwable $e) {}
                }

                return true;
            }

            // AIOSEO < 4: legacy post meta fallback
            if ($title !== null) update_post_meta($post_id, '_aioseo_title',       $title);
            if ($desc  !== null) update_post_meta($post_id, '_aioseo_description', $desc);
            return true;
        },

        'schema' => [
            'type'       => 'object',
            'properties' => [
                'title'       => ['type' => 'string'],
                'description' => ['type' => 'string'],
            ],
        ],
    ]);
});

/**
 * Expose a `seo_meta` REST field on every public taxonomy term so that
 * category / tag / custom taxonomy SEO metadata can be read and written
 * remotely via the bulk updater.
 *
 * Read/write is routed through each active SEO plugin's own PHP API so
 * that internal caches, hooks, and custom tables are updated correctly.
 *
 * Plugin priority (first match wins):
 *   1. Yoast SEO   → wpseo_taxonomy_meta option
 *   2. Rank Math   → term meta (rank_math_title / rank_math_description)
 *   3. AIOSEO 4+   → wp_aioseo_terms table via AIOSEO PHP API
 *   4. Generic     → term meta (_seo_title / _seo_description)
 */
add_action('rest_api_init', function () {
    $taxonomies = array_keys(get_taxonomies(['public' => true], 'names'));
    if (empty($taxonomies)) return;

    // ── Helper: read via Yoast taxonomy meta option ──────────────────────────
    $yoast_read = function ($term_id, $taxonomy) {
        if (!class_exists('WPSEO_Taxonomy_Meta')) return null;
        $title = WPSEO_Taxonomy_Meta::get_term_meta($term_id, $taxonomy, 'title');
        $desc  = WPSEO_Taxonomy_Meta::get_term_meta($term_id, $taxonomy, 'desc');
        if ($title !== false || $desc !== false) {
            return ['title' => (string)($title ?: ''), 'description' => (string)($desc ?: '')];
        }
        return null;
    };

    // ── Helper: write via Yoast taxonomy meta option ─────────────────────────
    $yoast_write = function ($term_id, $taxonomy, $title, $desc) {
        if (!class_exists('WPSEO_Taxonomy_Meta')) return false;
        $option_key = 'wpseo_taxonomy_meta';
        $all_meta   = (array) get_option($option_key, []);
        if (!isset($all_meta[$taxonomy]))           $all_meta[$taxonomy] = [];
        if (!isset($all_meta[$taxonomy][$term_id])) $all_meta[$taxonomy][$term_id] = [];
        if ($title !== null) $all_meta[$taxonomy][$term_id]['wpseo_title'] = $title;
        if ($desc  !== null) $all_meta[$taxonomy][$term_id]['wpseo_desc']  = $desc;
        update_option($option_key, $all_meta);
        return true;
    };

    register_rest_field($taxonomies, 'seo_meta', [
        'get_callback' => function ($term) use ($yoast_read) {
            $term_id  = (int) $term['id'];
            $taxonomy = $term['taxonomy'] ?? '';

            // 1. Yoast
            $yoast = $yoast_read($term_id, $taxonomy);
            if ($yoast !== null) return $yoast;

            // 2. Rank Math
            if (defined('RANK_MATH_VERSION')) {
                return [
                    'title'       => (string) get_term_meta($term_id, 'rank_math_title', true),
                    'description' => (string) get_term_meta($term_id, 'rank_math_description', true),
                ];
            }

            // 3. AIOSEO (term-level API)
            if (function_exists('aioseo') && method_exists(aioseo()->helpers, 'getTermMeta')) {
                try {
                    $obj = aioseo()->helpers->getTermMeta($term_id);
                    return [
                        'title'       => isset($obj->title)       ? (string) $obj->title       : '',
                        'description' => isset($obj->description) ? (string) $obj->description : '',
                    ];
                } catch (\Throwable $e) {}
            }

            // 4. Generic fallback
            return [
                'title'       => (string) get_term_meta($term_id, '_seo_title', true),
                'description' => (string) get_term_meta($term_id, '_seo_description', true),
            ];
        },

        'update_callback' => function ($value, $term) use ($yoast_write) {
            if (!current_user_can('manage_categories')) {
                return new WP_Error('rest_forbidden', 'Insufficient permissions', ['status' => 403]);
            }

            $term_id  = (int) $term->term_id;
            $taxonomy = (string) $term->taxonomy;
            $title    = isset($value['title'])       ? sanitize_text_field($value['title'])       : null;
            $desc     = isset($value['description']) ? sanitize_text_field($value['description']) : null;

            // 1. Yoast
            if ($yoast_write($term_id, $taxonomy, $title, $desc)) return true;

            // 2. Rank Math
            if (defined('RANK_MATH_VERSION')) {
                if ($title !== null) update_term_meta($term_id, 'rank_math_title', $title);
                if ($desc  !== null) update_term_meta($term_id, 'rank_math_description', $desc);
                wp_cache_delete('rank_math_term_meta_' . $term_id);
                return true;
            }

            // 3. AIOSEO
            if (function_exists('aioseo') && method_exists(aioseo()->helpers, 'getTermMeta')) {
                try {
                    $obj = aioseo()->helpers->getTermMeta($term_id);
                    if ($title !== null) $obj->title       = $title;
                    if ($desc  !== null) $obj->description = $desc;
                    $obj->save();
                    return true;
                } catch (\Throwable $e) {}
            }

            // 4. Generic fallback
            if ($title !== null) update_term_meta($term_id, '_seo_title', $title);
            if ($desc  !== null) update_term_meta($term_id, '_seo_description', $desc);
            return true;
        },

        'schema' => [
            'type'       => 'object',
            'properties' => [
                'title'       => ['type' => 'string'],
                'description' => ['type' => 'string'],
            ],
        ],
    ]);
});
