import axios from 'axios';
import { decrypt } from './cryptoService.js';

export const buildAuthHeader = (username, appPassword) => {
  const cleanPwd = String(appPassword).replace(/\s+/g, '');
  const token = Buffer.from(`${username}:${cleanPwd}`).toString('base64');
  return `Basic ${token}`;
};

/**
 * Build an axios instance preconfigured for a given client site.
 * Decrypts the stored app password on the fly — never logged.
 */
export const createWpClient = (site) => {
  const password = decrypt(site.appPasswordEncrypted);
  return axios.create({
    baseURL: site.siteUrl.replace(/\/$/, ''),
    headers: {
      Authorization: buildAuthHeader(site.username, password),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    timeout: 15000, // 15s per request — shorter window so cancel/stop is responsive
  });
};

/**
 * Fetches WP REST API root and (optionally) homepage HTML to determine:
 *   - WordPress version
 *   - Whether Application Passwords are available
 *   - The reason if they're not
 *
 * Returns { wpVersion, appPasswordsAvailable, appPasswordReason }
 * Never throws — all errors are captured and returned as nulls.
 */
export const detectWpInfo = async (siteUrl) => {
  const base = siteUrl.replace(/\/$/, '');
  let wpVersion             = null;
  let appPasswordsAvailable = false;
  let appPasswordReason     = null;

  // 1. Fetch the WP REST API root — it exposes the authentication methods list
  try {
    const { data } = await axios.get(`${base}/wp-json`, {
      timeout: 12000,
      headers: { Accept: 'application/json' },
    });

    appPasswordsAvailable = !!(data?.authentication?.['application-passwords']);

    // Some WP versions expose the version in the generator field
    if (data?.generator) {
      const m = String(data.generator).match(/WordPress\s+([\d.]+)/i);
      if (m) wpVersion = m[1];
    }
  } catch (_) {}

  // 2. If version still unknown, parse the homepage <meta name="generator"> tag
  if (!wpVersion) {
    try {
      const { data: html } = await axios.get(base, {
        timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEOBulkUpdater/1.0)' },
      });
      const m = String(html).match(/<meta[^>]+name=["']generator["'][^>]+content=["']WordPress\s+([\d.]+)["']/i)
             || String(html).match(/content=["']WordPress\s+([\d.]+)["'][^>]+name=["']generator["']/i);
      if (m) wpVersion = m[1];
    } catch (_) {}
  }

  // 3. Classify why app passwords aren't available so the UI can show a fix
  if (!appPasswordsAvailable) {
    if (wpVersion && parseFloat(wpVersion) < 5.6) {
      appPasswordReason = 'version_too_old';
    } else if (!base.startsWith('https://')) {
      appPasswordReason = 'no_ssl';
    } else {
      appPasswordReason = 'disabled';
    }
  }

  return { wpVersion, appPasswordsAvailable, appPasswordReason };
};

/**
 * Tests an arbitrary credential set by hitting /wp/v2/users/me.
 * Also runs detectWpInfo so callers get version + app-password status in one call.
 * Returns { ok, user?, wpVersion?, appPasswordsAvailable?, appPasswordReason?, error? }
 */
export const testConnection = async (siteUrl, username, password) => {
  const wpInfo = await detectWpInfo(siteUrl);

  try {
    const base = siteUrl.replace(/\/$/, '');
    const res = await axios.get(`${base}/wp-json/wp/v2/users/me`, {
      headers: { Authorization: buildAuthHeader(username, password) },
      timeout: 15000,
    });
    return {
      ok: true,
      user: { id: res.data.id, name: res.data.name },
      ...wpInfo,
    };
  } catch (err) {
    return {
      ok: false,
      error: err.response?.data?.message || err.message || 'Unknown error',
      ...wpInfo,
    };
  }
};
