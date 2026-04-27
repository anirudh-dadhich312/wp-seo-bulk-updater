import axios from 'axios';
import { buildAuthHeader } from './wpClient.js';
import { decrypt } from './cryptoService.js';

/**
 * Detects which SEO plugin is active on a WordPress site.
 *
 * Strategy:
 *   1. REST namespace probe — namespaces are only registered when a plugin is
 *      active, so their presence is a definitive signal. Rank Math takes
 *      priority over Yoast when both are present (migration scenario).
 *   2. Authenticated plugin list — filters by status==='active'.
 *   3. HTML sniff — last resort.
 */
export const detectSEOPlugin = async (siteUrl, username, password) => {
  const base = siteUrl.replace(/\/$/, '');
  const auth = buildAuthHeader(username, password);

  // 1. REST API namespace probe
  try {
    const res = await axios.get(`${base}/wp-json`, { timeout: 10000 });
    const namespaces = res.data?.namespaces || [];

    // Rank Math registers 'rankmath/v1' (new) or 'rank-math/v1' (legacy)
    const hasRankMath = namespaces.some((n) => n.startsWith('rankmath') || n.startsWith('rank-math'));
    const hasYoast    = namespaces.some((n) => n.startsWith('yoast'));
    const hasAioseo   = namespaces.some((n) => n.startsWith('aioseo'));

    // Namespaces are only present for ACTIVE plugins — trust them directly.
    // Rank Math beats Yoast when both present (user is migrating to Rank Math).
    if (hasRankMath) return 'rankmath';
    if (hasYoast)    return 'yoast';
    if (hasAioseo)   return 'aioseo';
  } catch (_) {}

  // 2. Authenticated plugin list (requires manage_plugins capability)
  try {
    const res = await axios.get(`${base}/wp-json/wp/v2/plugins`, {
      headers: { Authorization: auth },
      timeout: 10000,
    });
    const active = (res.data || [])
      .filter((p) => p.status === 'active')
      .map((p) => (p.plugin || '').toLowerCase());
    if (active.some((p) => p.includes('seo-by-rank-math') || p.includes('rank-math'))) return 'rankmath';
    if (active.some((p) => p.includes('wordpress-seo')    || p.includes('yoast')))      return 'yoast';
    if (active.some((p) => p.includes('all-in-one-seo-pack') || p.includes('aioseo')))  return 'aioseo';
  } catch (_) {}

  // 3. HTML sniff — last resort
  try {
    const res = await axios.get(base, { timeout: 10000, headers: { 'User-Agent': 'WP-SEO-Bulk-Updater/1.0' } });
    const html = String(res.data || '');
    if (/rank[\s-]?math/i.test(html))                         return 'rankmath';
    if (/yoast[\s-]?seo/i.test(html))                        return 'yoast';
    if (/all[\s-]?in[\s-]?one[\s-]?seo|aioseo/i.test(html)) return 'aioseo';
  } catch (_) {}

  return 'generic';
};

export const detectForSite = async (site) => {
  const password = decrypt(site.appPasswordEncrypted);
  return detectSEOPlugin(site.siteUrl, site.username, password);
};
