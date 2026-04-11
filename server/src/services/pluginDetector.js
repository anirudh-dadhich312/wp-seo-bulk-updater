import axios from 'axios';
import { buildAuthHeader } from './wpClient.js';
import { decrypt } from './cryptoService.js';

/**
 * Detects which SEO plugin is active on a WordPress site.
 *
 * Strategy:
 *   1. Probe /wp-json — REST namespaces give the cleanest signal
 *   2. Fall back to /wp-json/wp/v2/plugins (requires auth)
 *   3. Final fallback: sniff the homepage HTML for known generators
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
    if (namespaces.some((n) => n.startsWith('yoast'))) return 'yoast';
    if (namespaces.some((n) => n.startsWith('rankmath'))) return 'rankmath';
    if (namespaces.some((n) => n.startsWith('aioseo'))) return 'aioseo';
  } catch (_) {
    // continue
  }

  // 2. Authenticated plugin list (requires manage_plugins cap)
  try {
    const res = await axios.get(`${base}/wp-json/wp/v2/plugins`, {
      headers: { Authorization: auth },
      timeout: 10000,
    });
    const plugins = (res.data || []).map((p) => (p.plugin || '').toLowerCase());
    if (plugins.some((p) => p.includes('wordpress-seo') || p.includes('yoast'))) return 'yoast';
    if (plugins.some((p) => p.includes('seo-by-rank-math') || p.includes('rank-math'))) return 'rankmath';
    if (plugins.some((p) => p.includes('all-in-one-seo-pack') || p.includes('aioseo'))) return 'aioseo';
  } catch (_) {
    // continue
  }

  // 3. HTML sniff — last resort
  try {
    const res = await axios.get(base, { timeout: 10000, headers: { 'User-Agent': 'WP-SEO-Bulk-Updater/1.0' } });
    const html = String(res.data || '');
    if (/yoast[\s-]?seo/i.test(html)) return 'yoast';
    if (/rank[\s-]?math/i.test(html)) return 'rankmath';
    if (/all[\s-]?in[\s-]?one[\s-]?seo|aioseo/i.test(html)) return 'aioseo';
  } catch (_) {
    // ignore
  }

  return 'generic';
};

export const detectForSite = async (site) => {
  const password = decrypt(site.appPasswordEncrypted);
  return detectSEOPlugin(site.siteUrl, site.username, password);
};
