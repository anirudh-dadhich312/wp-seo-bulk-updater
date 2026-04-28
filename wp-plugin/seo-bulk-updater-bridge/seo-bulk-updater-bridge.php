<?php
/**
 * Plugin Name: SEO Bulk Updater Bridge
 * Plugin URI:  https://example.com/seo-bulk-updater
 * Description: Exposes Yoast / RankMath / AIOSEO meta fields via the WordPress REST API so they can be bulk-updated remotely from the SEO Bulk Updater dashboard.
 * Version:     1.3.0
 * Author:      SEO Bulk Updater
 * License:     GPL-2.0-or-later
 */

if (!defined('ABSPATH')) {
    exit;
}

add_action('rest_api_init', function () {
    $fields = [
        '_yoast_wpseo_title',
        '_yoast_wpseo_metadesc',
        'rank_math_title',
        'rank_math_description',
        '_aioseo_title',
        '_aioseo_description',
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

            $post_id = (int) $post->ID;
            $title = isset($value['title'])       ? sanitize_text_field($value['title'])       : null;
            $desc  = isset($value['description']) ? sanitize_text_field($value['description']) : null;

            if ($title !== null) update_post_meta($post_id, 'rank_math_title',       $title);
            if ($desc  !== null) update_post_meta($post_id, 'rank_math_description', $desc);

            wp_cache_delete('rank_math_post_meta_' . $post_id);
            wp_cache_delete($post_id, 'rank_math_post_meta');
            wp_cache_delete($post_id, 'post_meta');
            clean_post_cache($post_id);

            do_action('rank_math/post/update_meta', $post_id, [], []);
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

add_action('rest_api_init', function () {
    if (!function_exists('aioseo') && !defined('AIOSEO_VERSION')) {
        return;
    }

    $post_types = get_post_types(['public' => true], 'names');

    register_rest_field($post_types, 'aioseo', [
        'get_callback' => function ($post) {
            global $wpdb;
            $post_id = (int) $post['id'];
            $table   = $wpdb->prefix . 'aioseo_posts';

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
                return ['title' => '', 'description' => ''];
            }

            return [
                'title'       => (string) get_post_meta($post_id, '_aioseo_title',       true),
                'description' => (string) get_post_meta($post_id, '_aioseo_description', true),
            ];
        },
        'update_callback' => function ($value, $post) {
            if (!current_user_can('edit_post', $post->ID)) {
                return new WP_Error('rest_forbidden', 'Insufficient permissions', ['status' => 403]);
            }

            global $wpdb;
            $post_id = (int) $post->ID;
            $table   = $wpdb->prefix . 'aioseo_posts';

            $title = isset($value['title'])       ? sanitize_text_field($value['title'])       : null;
            $desc  = isset($value['description']) ? sanitize_text_field($value['description']) : null;

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

                wp_cache_delete("aioseo_post_{$post_id}");
                wp_cache_delete("aioseo_post_meta_{$post_id}");
                if (function_exists('aioseo') && isset(aioseo()->cache)) {
                    try { aioseo()->cache->delete("post_{$post_id}"); } catch (\Throwable $e) {}
                }

                return true;
            }

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

add_action('rest_api_init', function () {
    $taxonomies = array_keys(get_taxonomies(['public' => true], 'names'));
    if (empty($taxonomies)) return;

    $yoast_read = function ($term_id, $taxonomy) {
        if (!class_exists('WPSEO_Taxonomy_Meta')) return null;
        $title = WPSEO_Taxonomy_Meta::get_term_meta($term_id, $taxonomy, 'title');
        $desc  = WPSEO_Taxonomy_Meta::get_term_meta($term_id, $taxonomy, 'desc');
        if ($title !== false || $desc !== false) {
            return ['title' => (string)($title ?: ''), 'description' => (string)($desc ?: '')];
        }
        return null;
    };

    $yoast_write = function ($term_id, $taxonomy, $title, $desc) {
        if (!class_exists('WPSEO_Taxonomy_Meta')) return false;

        $option_key = 'wpseo_taxonomy_meta';

        // Purge WP object cache so we read fresh data from the DB, not a stale
        // persistent-cache entry (Redis/Memcached that may not auto-invalidate).
        wp_cache_delete($option_key, 'options');
        wp_cache_delete('alloptions', 'options');

        $all_meta = get_option($option_key, []);
        if (!is_array($all_meta)) $all_meta = [];

        if (!isset($all_meta[$taxonomy]) || !is_array($all_meta[$taxonomy])) {
            $all_meta[$taxonomy] = [];
        }
        if (!isset($all_meta[$taxonomy][$term_id]) || !is_array($all_meta[$taxonomy][$term_id])) {
            $all_meta[$taxonomy][$term_id] = [];
        }

        if ($title !== null) $all_meta[$taxonomy][$term_id]['wpseo_title'] = $title;
        if ($desc  !== null) $all_meta[$taxonomy][$term_id]['wpseo_desc']  = $desc;

        // update_option returns false when value is unchanged; treat that as OK.
        update_option($option_key, $all_meta);

        // Purge again so the next read (including the REST read-back from the
        // Node.js side) gets the value we just wrote, not a cached old copy.
        wp_cache_delete($option_key, 'options');
        wp_cache_delete('alloptions', 'options');

        return true;
    };

    register_rest_field($taxonomies, 'seo_meta', [
        'get_callback' => function ($term) use ($yoast_read) {
            $term_id  = (int) $term['id'];
            $taxonomy = $term['taxonomy'] ?? '';

            $yoast = $yoast_read($term_id, $taxonomy);
            if ($yoast !== null) return $yoast;

            if (defined('RANK_MATH_VERSION')) {
                return [
                    'title'       => (string) get_term_meta($term_id, 'rank_math_title', true),
                    'description' => (string) get_term_meta($term_id, 'rank_math_description', true),
                ];
            }

            if (function_exists('aioseo') && method_exists(aioseo()->helpers, 'getTermMeta')) {
                try {
                    $obj = aioseo()->helpers->getTermMeta($term_id);
                    return [
                        'title'       => isset($obj->title)       ? (string) $obj->title       : '',
                        'description' => isset($obj->description) ? (string) $obj->description : '',
                    ];
                } catch (\Throwable $e) {}
            }

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

            if ($yoast_write($term_id, $taxonomy, $title, $desc)) return true;

            if (defined('RANK_MATH_VERSION')) {
                if ($title !== null) update_term_meta($term_id, 'rank_math_title', $title);
                if ($desc  !== null) update_term_meta($term_id, 'rank_math_description', $desc);
                wp_cache_delete('rank_math_term_meta_' . $term_id);
                return true;
            }

            if (function_exists('aioseo') && method_exists(aioseo()->helpers, 'getTermMeta')) {
                try {
                    $obj = aioseo()->helpers->getTermMeta($term_id);
                    if ($title !== null) $obj->title       = $title;
                    if ($desc  !== null) $obj->description = $desc;
                    $obj->save();
                    return true;
                } catch (\Throwable $e) {}
            }

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
