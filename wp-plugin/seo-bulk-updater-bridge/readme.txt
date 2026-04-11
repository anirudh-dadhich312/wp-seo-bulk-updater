=== SEO Bulk Updater Bridge ===
Tags: seo, rest-api, yoast, rankmath, aioseo
Requires at least: 5.6
Tested up to: 6.5
Stable tag: 1.0.0
License: GPLv2 or later

Exposes Yoast / RankMath / AIOSEO SEO meta fields to the WordPress REST API
so they can be bulk-updated remotely from the SEO Bulk Updater dashboard.

== Installation ==
1. Zip the `seo-bulk-updater-bridge` folder.
2. In WP Admin → Plugins → Add New → Upload Plugin → upload the zip.
3. Activate the plugin.
4. Generate an Application Password under Users → Profile → Application Passwords.
5. Hand the URL, username, and Application Password to the SEO Bulk Updater dashboard.

== Notes ==
* Works with Yoast SEO and Rank Math out of the box (they store data in post_meta).
* For All In One SEO 4+, this plugin adds a virtual REST field `aioseo` to mirror
  reads/writes against AIOSEO's custom database table.
