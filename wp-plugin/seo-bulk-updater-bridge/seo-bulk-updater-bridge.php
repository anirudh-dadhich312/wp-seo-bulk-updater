<?php
/**
 * Plugin Name: SEO Bulk Updater Bridge
 * Description: Exposes Yoast / AIOSEO meta fields via the WordPress REST API for bulk updates.
 * Version:     1.8.0
 * Author:      SEO Bulk Updater
 * License:     GPL-2.0-or-later
 */

if (!defined('ABSPATH')) exit;

// SEO meta keys this plugin manages during REST requests.
$SEO_BRIDGE_POST_META_KEYS = [
    '_yoast_wpseo_title', '_yoast_wpseo_metadesc',
    '_aioseo_title',      '_aioseo_description',
    '_seo_title',         '_seo_description',
];

// Force REST API access for every public post type and taxonomy not already REST-enabled.
// Priority 999 ensures this runs after all theme/plugin registrations.
add_action('init', function () {
    $skip_types = [
        'attachment', 'revision', 'nav_menu_item', 'custom_css',
        'customize_changeset', 'oembed_cache', 'user_request',
        'wp_block', 'wp_template', 'wp_template_part',
        'wp_global_styles', 'wp_navigation',
    ];
    $skip_taxes = ['nav_menu', 'link_category', 'post_format'];

    foreach (get_post_types(['public' => true], 'objects') as $type => $obj) {
        if (in_array($type, $skip_types, true) || !empty($obj->show_in_rest)) continue;
        $obj->show_in_rest          = true;
        $obj->rest_base             = $obj->rest_base ?: $type;
        $obj->rest_controller_class = 'WP_REST_Posts_Controller';
    }

    foreach (get_taxonomies(['public' => true], 'objects') as $tax => $obj) {
        if (in_array($tax, $skip_taxes, true) || !empty($obj->show_in_rest)) continue;
        $obj->show_in_rest          = true;
        $obj->rest_base             = $obj->rest_base ?: $tax;
        $obj->rest_controller_class = 'WP_REST_Terms_Controller';
    }
}, 999);

// During REST requests: intercept update_post_meta for managed keys and return true.
// This prevents the "same-value" rest_meta_database_error AND blocks any other plugin
// (Yoast save_post hook, etc.) from writing stale values mid-request.
// The actual DB write happens in rest_after_insert at priority 999, after all processing.
// Outside REST context (WP admin, cron): returns $check unchanged — no interference.
add_filter('update_post_metadata', function ($check, $object_id, $meta_key, $meta_value, $prev_value) use ($SEO_BRIDGE_POST_META_KEYS) {
    if (!in_array($meta_key, $SEO_BRIDGE_POST_META_KEYS, true)) return $check;
    if (!defined('REST_REQUEST') || !REST_REQUEST) return $check;
    return true;
}, 10, 5);

// Register managed keys as REST-visible and hook the authoritative write for each post type.
// rest_after_insert fires after ALL processing (save_post, meta updates, other plugins)
// but BEFORE prepare_item_for_response — so the response also reflects the correct values.
add_action('rest_api_init', function () use ($SEO_BRIDGE_POST_META_KEYS) {
    $post_types = get_post_types(['public' => true], 'names');

    foreach ($post_types as $type) {
        foreach ($SEO_BRIDGE_POST_META_KEYS as $field) {
            register_post_meta($type, $field, [
                'show_in_rest'  => true,
                'single'        => true,
                'type'          => 'string',
                'auth_callback' => fn() => current_user_can('edit_posts'),
            ]);
        }
    }

    $write_meta = function ($post, $request) use ($SEO_BRIDGE_POST_META_KEYS) {
        $meta_payload = $request->get_param('meta');
        if (!is_array($meta_payload)) return;

        global $wpdb;
        $post_id  = (int) $post->ID;
        $modified = false;

        foreach ($SEO_BRIDGE_POST_META_KEYS as $meta_key) {
            if (!array_key_exists($meta_key, $meta_payload)) continue;
            $wpdb->delete($wpdb->postmeta, ['post_id' => $post_id, 'meta_key' => $meta_key], ['%d', '%s']);
            $wpdb->insert($wpdb->postmeta, [
                'post_id'    => $post_id,
                'meta_key'   => $meta_key,
                'meta_value' => maybe_serialize($meta_payload[$meta_key]),
            ], ['%d', '%s', '%s']);
            $meta_id  = (int) $wpdb->insert_id;
            $modified = true;

            // Fire WordPress's standard meta-update actions so plugins like Yoast that
            // hook into them (to clear their own internal title/description caches)
            // see the change. We bypass update_post_meta so these don't fire on their own.
            do_action('updated_post_meta', $meta_id, $post_id, $meta_key, $meta_payload[$meta_key]);
            do_action('updated_postmeta',  $meta_id, $post_id, $meta_key, $meta_payload[$meta_key]);
        }

        if ($modified) {
            wp_cache_delete($post_id, 'post_meta');
            clean_post_cache($post_id);

            // Yoast-specific: clear its indexable cache so the next frontend render
            // pulls the fresh title/description from postmeta instead of a cached row.
            if (class_exists('\\Yoast\\WP\\SEO\\Repositories\\Indexable_Repository')) {
                try {
                    $repo = \YoastSEO()->classes->get(\Yoast\WP\SEO\Repositories\Indexable_Repository::class);
                    $indexable = $repo->find_by_id_and_type($post_id, 'post');
                    if ($indexable) { $indexable->object_last_modified = current_time('mysql'); $indexable->save(); }
                } catch (\Throwable $e) {}
            }
            // Older Yoast / general fallback: invalidate the indexable row directly.
            $indexable_table = $wpdb->prefix . 'yoast_indexable';
            if ($wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $indexable_table)) === $indexable_table) {
                $wpdb->delete($indexable_table, ['object_id' => $post_id, 'object_type' => 'post'], ['%d', '%s']);
            }

            // Clear per-post page cache for common caching plugins so the
            // frontend immediately reflects the new SEO meta without a manual flush.
            if (function_exists('rocket_clean_post'))           rocket_clean_post($post_id);           // WP Rocket
            if (function_exists('w3tc_pgcache_flush_post'))     w3tc_pgcache_flush_post($post_id);     // W3 Total Cache
            if (function_exists('wp_cache_post_change'))        wp_cache_post_change($post_id);        // WP Super Cache
            if (function_exists('litespeed_purge_post'))        litespeed_purge_post($post_id);        // LiteSpeed Cache
            if (function_exists('sg_cachepress_purge_cache'))   sg_cachepress_purge_cache();           // SG Optimizer
            if (function_exists('cache_enabler_clear_page_cache_by_post_id')) {
                cache_enabler_clear_page_cache_by_post_id($post_id);                                  // Cache Enabler
            }
            do_action('litespeed_purge_post', $post_id);       // LiteSpeed (hook form)
        }
    };

    foreach ($post_types as $post_type) {
        add_action("rest_after_insert_{$post_type}", $write_meta, 999, 2);
    }
});

// AIOSEO 4+: uses a custom table (wp_aioseo_posts) instead of wp_postmeta,
// so it needs its own REST field for both read and write.
add_action('rest_api_init', function () {
    if (!function_exists('aioseo') && !defined('AIOSEO_VERSION')) return;

    $post_types = get_post_types(['public' => true], 'names');

    register_rest_field($post_types, 'aioseo', [
        'get_callback' => function ($post) {
            global $wpdb;
            $post_id = (int) $post['id'];
            $table   = $wpdb->prefix . 'aioseo_posts';

            if ($wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table)) === $table) {
                $row = $wpdb->get_row($wpdb->prepare(
                    "SELECT title, description FROM `{$table}` WHERE post_id = %d LIMIT 1", $post_id
                ));
                return $row
                    ? ['title' => (string)($row->title ?? ''), 'description' => (string)($row->description ?? '')]
                    : ['title' => '', 'description' => ''];
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
            $title   = isset($value['title'])       ? sanitize_text_field($value['title'])       : null;
            $desc    = isset($value['description']) ? sanitize_text_field($value['description']) : null;

            if ($wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table)) === $table) {
                $exists = $wpdb->get_var($wpdb->prepare(
                    "SELECT id FROM `{$table}` WHERE post_id = %d LIMIT 1", $post_id
                ));
                $data   = ['updated' => current_time('mysql')];
                $format = ['%s'];
                if ($title !== null) { $data['title']       = $title; $format[] = '%s'; }
                if ($desc  !== null) { $data['description'] = $desc;  $format[] = '%s'; }

                if ($exists) {
                    $wpdb->update($table, $data, ['post_id' => $post_id], $format, ['%d']);
                } else {
                    $data['post_id'] = $post_id;
                    $data['created'] = current_time('mysql');
                    $format[] = '%d'; $format[] = '%s';
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
        'schema' => ['type' => 'object', 'properties' => [
            'title'       => ['type' => 'string'],
            'description' => ['type' => 'string'],
        ]],
    ]);
});

// URL resolver: converts a full permalink to a post/term ID using WordPress's own rewrite rules.
// This is the only reliable way to resolve date-based permalinks (e.g. /2015/07/01/slug/)
// where the last path segment alone is ambiguous or matches the wrong post.
add_action('rest_api_init', function () {
    register_rest_route('seo-bridge/v1', '/resolve', [
        'methods'             => WP_REST_Server::CREATABLE,
        'permission_callback' => fn() => current_user_can('edit_posts'),
        'args'                => [
            'url' => ['required' => true, 'type' => 'string', 'sanitize_callback' => 'esc_url_raw'],
        ],
        'callback' => function (WP_REST_Request $request) {
            $url     = $request->get_param('url');
            $post_id = url_to_postid($url);

            if ($post_id) {
                $post      = get_post($post_id);
                $type_obj  = get_post_type_object($post->post_type);
                $rest_base = $type_obj->rest_base ?: $post->post_type;
                return rest_ensure_response(['kind' => 'post', 'id' => $post_id, 'type' => $rest_base]);
            }

            // url_to_postid() returns 0 for special WordPress pages (blog index, front page).
            // Check explicitly against the WordPress "Posts page" and "Front page" settings.
            $segments = array_values(array_filter(explode('/', parse_url($url, PHP_URL_PATH) ?: '')));
            $slug     = end($segments);

            $page_for_posts  = (int) get_option('page_for_posts');
            $page_on_front   = (int) get_option('page_on_front');

            foreach ([$page_for_posts, $page_on_front] as $special_id) {
                if ($special_id && $slug === get_post_field('post_name', $special_id)) {
                    $post      = get_post($special_id);
                    $type_obj  = get_post_type_object($post->post_type);
                    $rest_base = $type_obj->rest_base ?: $post->post_type;
                    return rest_ensure_response(['kind' => 'post', 'id' => $special_id, 'type' => $rest_base]);
                }
            }

            // Taxonomy term fallback: match the slug against all public taxonomies.
            if ($slug) {
                foreach (get_taxonomies(['public' => true], 'objects') as $tax => $tax_obj) {
                    $term = get_term_by('slug', $slug, $tax);
                    if ($term && !is_wp_error($term)) {
                        $rest_base = $tax_obj->rest_base ?: $tax;
                        return rest_ensure_response([
                            'kind'     => 'term',
                            'id'       => $term->term_id,
                            'taxonomy' => $tax,
                            'restBase' => $rest_base,
                        ]);
                    }
                }
            }

            return new WP_Error('not_found', "Could not resolve URL: {$url}", ['status' => 404]);
        },
    ]);
});

// Taxonomy terms: expose a 'seo_meta' REST field for reading and writing SEO title/description.
// Yoast stores taxonomy meta in the wpseo_taxonomy_meta option (not term meta), so we write
// directly via $wpdb to bypass the sanitize_option filter that silently strips title values.
add_action('rest_api_init', function () {
    $taxonomies = array_keys(get_taxonomies(['public' => true], 'names'));
    if (empty($taxonomies)) return;

    // Read Yoast taxonomy meta directly from DB, bypassing any stale object cache.
    $yoast_raw_read = function ($term_id, $taxonomy) {
        global $wpdb;
        $row = $wpdb->get_var($wpdb->prepare(
            "SELECT option_value FROM {$wpdb->options} WHERE option_name = %s LIMIT 1",
            'wpseo_taxonomy_meta'
        ));
        if (!$row) return null;
        $all = maybe_unserialize($row);
        if (!is_array($all)) return null;
        $data = $all[$taxonomy][$term_id] ?? null;
        if (!is_array($data)) return null;
        $t = $data['wpseo_title'] ?? false;
        $d = $data['wpseo_desc']  ?? false;
        if ($t === false && $d === false) return null;
        return ['title' => (string)($t ?: ''), 'description' => (string)($d ?: '')];
    };

    $yoast_read = function ($term_id, $taxonomy) use ($yoast_raw_read) {
        if (class_exists('WPSEO_Taxonomy_Meta')) {
            wp_cache_delete('wpseo_taxonomy_meta', 'options');
            $title = WPSEO_Taxonomy_Meta::get_term_meta($term_id, $taxonomy, 'title');
            $desc  = WPSEO_Taxonomy_Meta::get_term_meta($term_id, $taxonomy, 'desc');
            if ($title !== false || $desc !== false) {
                return ['title' => (string)($title ?: ''), 'description' => (string)($desc ?: '')];
            }
        }
        return $yoast_raw_read($term_id, $taxonomy);
    };

    // Write Yoast taxonomy meta directly via $wpdb to bypass sanitize_option_wpseo_taxonomy_meta.
    $yoast_write = function ($term_id, $taxonomy, $title, $desc) {
        if (!class_exists('WPSEO_Taxonomy_Meta')) return false;

        global $wpdb;
        $key = 'wpseo_taxonomy_meta';
        $raw = $wpdb->get_var($wpdb->prepare(
            "SELECT option_value FROM {$wpdb->options} WHERE option_name = %s LIMIT 1", $key
        ));
        $all = ($raw ? maybe_unserialize($raw) : []);
        if (!is_array($all)) $all = [];

        if (!isset($all[$taxonomy]) || !is_array($all[$taxonomy])) $all[$taxonomy] = [];
        if (!isset($all[$taxonomy][$term_id]) || !is_array($all[$taxonomy][$term_id])) $all[$taxonomy][$term_id] = [];

        if ($title !== null) $all[$taxonomy][$term_id]['wpseo_title'] = $title;
        if ($desc  !== null) $all[$taxonomy][$term_id]['wpseo_desc']  = $desc;

        $serialized = maybe_serialize($all);

        if ($wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$wpdb->options} WHERE option_name = %s", $key))) {
            $wpdb->update($wpdb->options, ['option_value' => $serialized], ['option_name' => $key], ['%s'], ['%s']);
        } else {
            $wpdb->insert($wpdb->options, ['option_name' => $key, 'option_value' => $serialized, 'autoload' => 'yes'], ['%s', '%s', '%s']);
        }

        wp_cache_delete($key, 'options');
        wp_cache_delete('alloptions', 'options');
        clean_term_cache([$term_id], $taxonomy);
        return true;
    };

    register_rest_field($taxonomies, 'seo_meta', [
        'get_callback' => function ($term) use ($yoast_read) {
            $term_id  = (int) $term['id'];
            $taxonomy = $term['taxonomy'] ?? '';

            $yoast = $yoast_read($term_id, $taxonomy);
            if ($yoast !== null) return $yoast;

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
        'schema' => ['type' => 'object', 'properties' => [
            'title'       => ['type' => 'string'],
            'description' => ['type' => 'string'],
        ]],
    ]);
});
