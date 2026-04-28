import axios from 'axios';
import { buildAuthHeader } from './wpClient.js';
import { decrypt } from './cryptoService.js';

export const detectSEOPlugin = async (siteUrl, username, password) => {
  const base = siteUrl.replace(/\/$/, '');
  const auth = buildAuthHeader(username, password);

  // 1. REST namespace probe — namespaces are only present for active plugins.
  try {
    const res = await axios.get(`${base}/wp-json`, { timeout: 10000 });
    const namespaces = res.data?.namespaces || [];
    if (namespaces.some((n) => n.startsWith('yoast')))  return 'yoast';
    if (namespaces.some((n) => n.startsWith('aioseo'))) return 'aioseo';
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
    if (active.some((p) => p.includes('wordpress-seo')       || p.includes('yoast')))  return 'yoast';
    if (active.some((p) => p.includes('all-in-one-seo-pack') || p.includes('aioseo'))) return 'aioseo';
  } catch (_) {}

  // 3. HTML sniff — last resort
  try {
    const res = await axios.get(base, { timeout: 10000, headers: { 'User-Agent': 'WP-SEO-Bulk-Updater/1.0' } });
    const html = String(res.data || '');
    if (/yoast[\s-]?seo/i.test(html))                        return 'yoast';
    if (/all[\s-]?in[\s-]?one[\s-]?seo|aioseo/i.test(html)) return 'aioseo';
  } catch (_) {}

  return 'generic';
};

export const detectForSite = async (site) => {
  const password = decrypt(site.appPasswordEncrypted);
  return detectSEOPlugin(site.siteUrl, site.username, password);
};
