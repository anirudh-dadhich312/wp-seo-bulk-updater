<?php
/**
 * Plugin Name: SEO Bulk Updater Bridge
 * Plugin URI:  https://example.com/seo-bulk-updater
 * Description: Exposes Yoast / RankMath / AIOSEO meta fields via the WordPress REST API so they can be bulk-updated remotely from the SEO Bulk Updater dashboard.
 * Version:     1.5.0
 * Author:      SEO Bulk Updater
 * License:     GPL-2.0-or-later
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * WordPress's update_post_meta returns false — and the REST API then returns
 * "Could not update the meta value … in database." — whenever the new value
 * is identical to the already-stored value (WordPress skips a no-op update).
 *
 * We intercept the update_post_metadata filter for every meta key we manage
 * and force the write through $wpdb directly, bypassing WordPress's same-value
 * short-circuit so the REST endpoint always gets a truthy return value.
 */
add_filter('update_post_metadata', function ($check, $object_id, $meta_key, $meta_value, $prev_value) {
    static $managed_keys = null;
    if ($managed_keys === null) {
        $managed_keys = [
            '_yoast_wpseo_title', '_yoast_wpseo_metadesc',
            'rank_math_title',    'rank_math_description',
            '_aioseo_title',      '_aioseo_description',
            '_seo_title',         '_seo_description',
        ];
    }

    if (!in_array($meta_key, $managed_keys, true)) {
        return $check; // not our key — let WordPress handle it normally
    }

    global $wpdb;
    $oid = (int) $object_id;

    // Delete any existing row(s) for this post+key, then insert fresh.
    // This guarantees success even when the value hasn't changed, because
    // update_post_meta compares old == new and returns false for no-op updates.
    $wpdb->delete($wpdb->postmeta, ['post_id' => $oid, 'meta_key' => $meta_key], ['%d', '%s']);
    $wpdb->insert(
        $wpdb->postmeta,
        ['post_id' => $oid, 'meta_key' => $meta_key, 'meta_value' => maybe_serialize($meta_value)],
        ['%d', '%s', '%s']
    );

    // Bust WordPress's in-memory post-meta cache so subsequent get_post_meta
    // calls in the same request return the freshly written value.
    wp_cache_delete($oid, 'post_meta');
    clean_post_cache($oid);

    return true; // non-null return tells WordPress we handled the update
}, 10, 5);

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

    /**
     * Read Yoast taxonomy meta directly from the DB option so we bypass
     * any stale in-memory cache inside WPSEO_Option_Taxonomy.
     */
    $yoast_raw_read = function ($term_id, $taxonomy) {
        global $wpdb;
        $row = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT option_value FROM {$wpdb->options} WHERE option_name = %s LIMIT 1",
                'wpseo_taxonomy_meta'
            )
        );
        if (!$row) return null;
        $all_meta = maybe_unserialize($row);
        if (!is_array($all_meta)) return null;
        $term_data = $all_meta[$taxonomy][$term_id] ?? null;
        if (!is_array($term_data)) return null;
        $t = $term_data['wpseo_title'] ?? false;
        $d = $term_data['wpseo_desc']  ?? false;
        if ($t === false && $d === false) return null;
        return ['title' => (string)($t ?: ''), 'description' => (string)($d ?: '')];
    };

    $yoast_read = function ($term_id, $taxonomy) use ($yoast_raw_read) {
        // Try Yoast's class first; fall back to direct DB read so we always
        // get a value even if WPSEO_Taxonomy_Meta has a stale static cache.
        if (class_exists('WPSEO_Taxonomy_Meta')) {
            wp_cache_delete('wpseo_taxonomy_meta', 'options');
            $title = WPSEO_Taxonomy_Meta::get_term_meta($term_id, $taxonomy, 'title');
            $desc  = WPSEO_Taxonomy_Meta::get_term_meta($term_id, $taxonomy, 'desc');
            if ($title !== false || $desc !== false) {
                return ['title' => (string)($title ?: ''), 'description' => (string)($desc ?: '')];
            }
        }
        // Fallback: read directly from the serialised option in the DB.
        return $yoast_raw_read($term_id, $taxonomy);
    };

    /**
     * Write Yoast taxonomy meta directly via $wpdb to bypass the
     * sanitize_option_wpseo_taxonomy_meta filter that WPSEO_Option_Taxonomy
     * registers — that filter can silently strip or overwrite our title value.
     */
    $yoast_write = function ($term_id, $taxonomy, $title, $desc) use ($yoast_raw_read) {
        if (!class_exists('WPSEO_Taxonomy_Meta')) return false;

        global $wpdb;
        $option_key = 'wpseo_taxonomy_meta';

        // Read the raw serialised value directly from the DB so we start
        // with an accurate baseline (no WP object-cache or Yoast static cache).
        $current_serialized = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT option_value FROM {$wpdb->options} WHERE option_name = %s LIMIT 1",
                $option_key
            )
        );

        $all_meta = $current_serialized ? maybe_unserialize($current_serialized) : [];
        if (!is_array($all_meta)) $all_meta = [];

        if (!isset($all_meta[$taxonomy]) || !is_array($all_meta[$taxonomy])) {
            $all_meta[$taxonomy] = [];
        }
        if (!isset($all_meta[$taxonomy][$term_id]) || !is_array($all_meta[$taxonomy][$term_id])) {
            $all_meta[$taxonomy][$term_id] = [];
        }

        if ($title !== null) $all_meta[$taxonomy][$term_id]['wpseo_title'] = $title;
        if ($desc  !== null) $all_meta[$taxonomy][$term_id]['wpseo_desc']  = $desc;

        $new_serialized = maybe_serialize($all_meta);

        // Write directly — this skips update_option and therefore skips the
        // sanitize_option_* filter that Yoast hooks to sanitise / clean the option.
        $row_exists = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM {$wpdb->options} WHERE option_name = %s",
                $option_key
            )
        );

        if ($row_exists) {
            $wpdb->update(
                $wpdb->options,
                ['option_value' => $new_serialized],
                ['option_name'  => $option_key],
                ['%s'],
                ['%s']
            );
        } else {
            $wpdb->insert(
                $wpdb->options,
                ['option_name' => $option_key, 'option_value' => $new_serialized, 'autoload' => 'yes'],
                ['%s', '%s', '%s']
            );
        }

        // Bust ALL cache layers so subsequent reads in this and future requests
        // see the freshly-written value.
        wp_cache_delete($option_key, 'options');
        wp_cache_delete('alloptions', 'options');

        // Tell WordPress caching plugins (WP Rocket, LiteSpeed, W3TC, Divi …)
        // to purge any cached HTML for pages related to this taxonomy term so
        // the browser sees the updated title immediately.
        clean_term_cache([$term_id], $taxonomy);

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
