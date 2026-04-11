import axios from 'axios';
import { decrypt } from './cryptoService.js';

export const buildAuthHeader = (username, appPassword) => {
  // WP Application Passwords accept the password with or without spaces
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
    timeout: 25000,
  });
};

/**
 * Tests an arbitrary credential set by hitting /wp/v2/users/me.
 * Returns { ok, user?, error? } — never throws.
 */
export const testConnection = async (siteUrl, username, password) => {
  try {
    const base = siteUrl.replace(/\/$/, '');
    const res = await axios.get(`${base}/wp-json/wp/v2/users/me`, {
      headers: { Authorization: buildAuthHeader(username, password) },
      timeout: 15000,
    });
    return { ok: true, user: { id: res.data.id, name: res.data.name } };
  } catch (err) {
    return {
      ok: false,
      error: err.response?.data?.message || err.message || 'Unknown error',
    };
  }
};
