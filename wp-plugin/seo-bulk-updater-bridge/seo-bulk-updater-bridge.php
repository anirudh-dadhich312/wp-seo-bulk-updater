<?php
/**
 * Plugin Name: SEO Bulk Updater Bridge
 * Plugin URI:  https://example.com/seo-bulk-updater
 * Description: Exposes Yoast / RankMath / AIOSEO meta fields via the WordPress REST API so they can be bulk-updated remotely from the SEO Bulk Updater dashboard.
 * Version:     1.0.0
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
 * AIOSEO 4+ stores SEO data in its own custom table (`wp_aioseo_posts`),
 * so registering post meta is not enough. We mirror reads/writes here
 * through AIOSEO's own PHP API so the custom table is always kept in sync.
 */
add_action('rest_api_init', function () {
    if (!function_exists('aioseo')) {
        return;
    }

    $post_types = get_post_types(['public' => true], 'names');

    register_rest_field($post_types, 'aioseo', [
        'get_callback' => function ($post) {
            try {
                $obj = aioseo()->helpers->getPost($post['id']);
                return [
                    'title'       => isset($obj->title) ? (string) $obj->title : '',
                    'description' => isset($obj->description) ? (string) $obj->description : '',
                ];
            } catch (\Throwable $e) {
                // Fallback: try legacy post meta (AIOSEO < 4)
                return [
                    'title'       => (string) get_post_meta($post['id'], '_aioseo_title', true),
                    'description' => (string) get_post_meta($post['id'], '_aioseo_description', true),
                ];
            }
        },
        'update_callback' => function ($value, $post) {
            if (!current_user_can('edit_post', $post->ID)) {
                return new WP_Error('rest_forbidden', 'Insufficient permissions', ['status' => 403]);
            }
            try {
                $obj = aioseo()->helpers->getPost($post->ID);
                if (isset($value['title'])) {
                    $obj->title = sanitize_text_field($value['title']);
                }
                if (isset($value['description'])) {
                    $obj->description = sanitize_text_field($value['description']);
                }
                $obj->save();
                return true;
            } catch (\Throwable $e) {
                // Fallback: write to legacy post meta (AIOSEO < 4)
                if (isset($value['title'])) {
                    update_post_meta($post->ID, '_aioseo_title', sanitize_text_field($value['title']));
                }
                if (isset($value['description'])) {
                    update_post_meta($post->ID, '_aioseo_description', sanitize_text_field($value['description']));
                }
                return true;
            }
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
