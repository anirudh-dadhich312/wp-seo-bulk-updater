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
 * Optional: expose AIOSEO v4+ data via a virtual REST field.
 * AIOSEO 4+ stores SEO data in its own custom table (`wp_aioseo_posts`),
 * so registering post meta is not enough. We mirror reads/writes here.
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
                    'title'       => isset($obj->title) ? $obj->title : '',
                    'description' => isset($obj->description) ? $obj->description : '',
                ];
            } catch (\Throwable $e) {
                return null;
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
                return new WP_Error('aioseo_save_failed', $e->getMessage(), ['status' => 500]);
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
