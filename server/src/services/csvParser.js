import Papa from 'papaparse';

const REQUIRED_COLUMNS = ['post_url', 'meta_title', 'meta_description'];

/**
 * Remap common Windows-1252 / Latin-1 mis-decoded characters that appear
 * when Excel saves a CSV without a UTF-8 BOM. The mangled bytes are the
 * result of treating Windows-1252 bytes as if they were ISO-8859-1.
 */
const WIN1252_MAP = {
  '': '“', // left double quote
  '': '”', // right double quote
  '': '‘', // left single quote
  '': '’', // right single quote
  '': '–', // en dash
  '': '—', // em dash
  '': '…', // ellipsis
  'â': '“', // UTF-8 left double quote mis-read as latin1
  'â': '”',
  'â': '‘',
  'â': '’',
};

const WIN1252_RE = new RegExp(Object.keys(WIN1252_MAP).join('|'), 'g');

/**
 * Normalize a string coming from an Excel CSV:
 *  - Fix Windows-1252 mis-decoded characters
 *  - Collapse non-breaking and zero-width spaces to regular spaces
 *  - Normalize Unicode to NFC (canonical composition)
 *  - Collapse multiple consecutive spaces to one
 */
const normalizeText = (str) => {
  if (!str) return str;
  return str
    .replace(WIN1252_RE, (m) => WIN1252_MAP[m] ?? m)
    .replace(/[            ]/g, ' ')
    .replace(/[​‌‍﻿]/g, '')  // zero-width chars
    .normalize('NFC')
    .replace(/ {2,}/g, ' ')   // collapse double-spaces
    .trim();
};

/**
 * Parse a CSV buffer into an array of normalized rows.
 * Supports UTF-8 (with or without BOM) and Windows-1252 files from Excel.
 * Required columns: post_url, meta_title, meta_description
 * Headers are case-insensitive and spaces are normalized to underscores.
 */
export const parseMetaCsv = (buffer) => {
  // Try UTF-8 first; fall back to latin1 for Excel CSVs without BOM
  let text = buffer.toString('utf8').replace(/^﻿/, '');

  // Heuristic: if parsing produces many replacement chars (U+FFFD), the file
  // is likely Windows-1252. Re-read it as latin1 and remap known code points.
  const replacementCount = (text.match(/�/g) || []).length;
  if (replacementCount > 3) {
    text = buffer.toString('latin1');
  }

  const parsed = Papa.parse(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_'),
  });

  if (parsed.errors.length) {
    const first = parsed.errors[0];
    throw new Error(`CSV parse error on row ${first.row}: ${first.message}`);
  }

  const headers = parsed.meta.fields || [];
  const missing = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
  if (missing.length) {
    throw new Error(`CSV missing required columns: ${missing.join(', ')}`);
  }

  const rows = parsed.data
    .map((row) => ({
      postUrl:        normalizeText(String(row.post_url         || '')),
      newTitle:       normalizeText(String(row.meta_title       || '')),
      newDescription: normalizeText(String(row.meta_description || '')),
    }))
    .filter((r) => r.postUrl);

  if (rows.length === 0) throw new Error('CSV contains no data rows');

  return rows;
};
