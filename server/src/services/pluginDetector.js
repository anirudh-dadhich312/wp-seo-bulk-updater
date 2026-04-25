import axios from 'axios';
import { buildAuthHeader } from './wpClient.js';
import { decrypt } from './cryptoService.js';

/**
 * Detects which SEO plugin is active on a WordPress site.
 *
 * Strategy:
 *   1. Probe /wp-json — REST namespaces give the cleanest signal.
 *      When multiple SEO plugins are detected, confirm which is truly
 *      active by hitting a plugin-specific endpoint.
 *   2. Fall back to /wp-json/wp/v2/plugins (requires auth) — only
 *      considers plugins with status === 'active'.
 *   3. Final fallback: sniff the homepage HTML for known generators.
 *
 * Returns one of: 'yoast' | 'rankmath' | 'aioseo' | 'generic'
 */
export const detectSEOPlugin = async (siteUrl, username, password) => {
  const base = siteUrl.replace(/\/$/, '');
  const auth = buildAuthHeader(username, password);

  // 1. REST API namespace probe
  try {
    const res = await axios.get(`${base}/wp-json`, { timeout: 10000 });
    const namespaces = res.data?.namespaces || [];

    // Rank Math registers both 'rankmath/v1' and 'rank-math/v1' depending on version
    const hasRankMath = namespaces.some(
      (n) => n.startsWith('rankmath') || n.startsWith('rank-math')
    );
    const hasYoast  = namespaces.some((n) => n.startsWith('yoast'));
    const hasAioseo = namespaces.some((n) => n.startsWith('aioseo'));

    // When only one plugin's namespace is present, return immediately
    const detected = [hasRankMath && 'rankmath', hasYoast && 'yoast', hasAioseo && 'aioseo'].filter(Boolean);
    if (detected.length === 1) return detected[0];

    // Multiple SEO plugins installed — probe each to find which is truly active.
    // Rank Math: /wp-json/rankmath/v1/cn is a public endpoint that only exists when active.
    if (hasRankMath) {
      const rmBase = namespaces.find((n) => n.startsWith('rank-math')) ? 'rank-math' : 'rankmath';
      try {
        await axios.get(`${base}/wp-json/${rmBase}/v1/cn`, { timeout: 5000 });
        return 'rankmath';
      } catch (_) {}
    }

    if (hasYoast)  return 'yoast';
    if (hasAioseo) return 'aioseo';
  } catch (_) {
    // continue to next strategy
  }

  // 2. Authenticated plugin list (requires manage_plugins cap)
  try {
    const res = await axios.get(`${base}/wp-json/wp/v2/plugins`, {
      headers: { Authorization: auth },
      timeout: 10000,
    });
    // Only consider plugins that are currently active
    const active = (res.data || [])
      .filter((p) => p.status === 'active')
      .map((p) => (p.plugin || '').toLowerCase());
    if (active.some((p) => p.includes('seo-by-rank-math') || p.includes('rank-math'))) return 'rankmath';
    if (active.some((p) => p.includes('wordpress-seo') || p.includes('yoast')))         return 'yoast';
    if (active.some((p) => p.includes('all-in-one-seo-pack') || p.includes('aioseo')))  return 'aioseo';
  } catch (_) {
    // continue
  }

  // 3. HTML sniff — last resort
  try {
    const res = await axios.get(base, { timeout: 10000, headers: { 'User-Agent': 'WP-SEO-Bulk-Updater/1.0' } });
    const html = String(res.data || '');
    if (/rank[\s-]?math/i.test(html))                          return 'rankmath';
    if (/yoast[\s-]?seo/i.test(html))                         return 'yoast';
    if (/all[\s-]?in[\s-]?one[\s-]?seo|aioseo/i.test(html))  return 'aioseo';
  } catch (_) {
    // ignore
  }

  return 'generic';
};

export const detectForSite = async (site) => {
  const password = decrypt(site.appPasswordEncrypted);
  return detectSEOPlugin(site.siteUrl, site.username, password);
};
