import Papa from 'papaparse';

const REQUIRED_COLUMNS = ['post_url', 'meta_title', 'meta_description'];

/**
 * Parse a CSV buffer into an array of normalized rows.
 * Required columns: post_url, meta_title, meta_description
 * Header is case-insensitive and accepts spaces.
 */
export const parseMetaCsv = (buffer) => {
  const text = buffer.toString('utf8').replace(/^\uFEFF/, ''); // strip UTF-8 BOM
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
      postUrl: String(row.post_url || '').trim(),
      newTitle: String(row.meta_title || '').trim(),
      newDescription: String(row.meta_description || '').trim(),
    }))
    .filter((r) => r.postUrl);

  if (rows.length === 0) throw new Error('CSV contains no data rows');

  return rows;
};
