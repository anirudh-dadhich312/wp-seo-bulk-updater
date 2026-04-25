/**
 * Universal field map for SEO plugins (used for post/page/CPT writes).
 * Yoast and generic write via the standard WP `meta` object.
 * Rank Math and AIOSEO write via dedicated REST fields in the bridge plugin.
 */
export const META_FIELD_MAP = {
  yoast:   { title: '_yoast_wpseo_title',  description: '_yoast_wpseo_metadesc' },
  generic: { title: '_seo_title',           description: '_seo_description' },
};

export const getMetaFields = (plugin) => META_FIELD_MAP[plugin] || META_FIELD_MAP.generic;

// Rank Math and AIOSEO use dedicated bridge REST fields on posts
const REST_FIELD_PLUGINS = {
  rankmath: 'rankmath',
  aioseo:   'aioseo',
};

// ─── POST / PAGE / CPT ────────────────────────────────────────────────────────

/**
 * Read SEO meta from a standard post/page/CPT.
 * Uses context=edit so private meta is visible to authenticated users.
 */
export const readPostMeta = async (wp, postType, postId, plugin) => {
  const res = await wp.get(`/wp-json/wp/v2/${postType}/${postId}`, {
    params: { context: 'edit' },
  });

  const restField = REST_FIELD_PLUGINS[plugin];
  if (restField) {
    const field = res.data?.[restField] || {};
    return { title: field.title || '', description: field.description || '' };
  }

  const fields = getMetaFields(plugin);
  const meta = res.data?.meta || {};
  return { title: meta[fields.title] || '', description: meta[fields.description] || '' };
};

/**
 * Write SEO meta to a standard post/page/CPT.
 *
 * Strategy by plugin:
 *   yoast / generic  → `meta` object (keys registered show_in_rest=true by bridge)
 *   rankmath         → `rankmath` REST field (bridge fires RM hooks + cache flush)
 *   aioseo           → `aioseo`   REST field (bridge writes to wp_aioseo_posts table)
 */
export const writePostMeta = async (wp, postType, postId, plugin, { title, description }) => {
  const restField = REST_FIELD_PLUGINS[plugin];

  if (restField) {
    const payload = {};
    if (title       != null) payload.title       = title;
    if (description != null) payload.description = description;
    const res = await wp.post(`/wp-json/wp/v2/${postType}/${postId}`, { [restField]: payload });
    return res.data;
  }

  const fields = getMetaFields(plugin);
  const meta = {};
  if (title       != null) meta[fields.title]       = title;
  if (description != null) meta[fields.description] = description;
  const res = await wp.post(`/wp-json/wp/v2/${postType}/${postId}`, { meta });
  return res.data;
};

// ─── TAXONOMY TERMS (categories, tags, custom taxonomies) ─────────────────────

/**
 * Read SEO meta for a taxonomy term.
 * The bridge plugin exposes a `seo_meta` REST field on all public taxonomy terms
 * that routes reads through the active SEO plugin's native API.
 */
export const readTermMeta = async (wp, restBase, termId) => {
  try {
    const res = await wp.get(`/wp-json/wp/v2/${restBase}/${termId}`);
    const field = res.data?.seo_meta || {};
    return { title: field.title || '', description: field.description || '' };
  } catch {
    return { title: '', description: '' };
  }
};

/**
 * Write SEO meta for a taxonomy term via the bridge plugin's `seo_meta` field.
 * The bridge routes writes through each plugin's native taxonomy meta API
 * (Yoast wpseo_taxonomy_meta option, Rank Math term meta, AIOSEO terms table).
 */
export const writeTermMeta = async (wp, restBase, termId, { title, description }) => {
  const payload = {};
  if (title       != null) payload.title       = title;
  if (description != null) payload.description = description;
  const res = await wp.post(`/wp-json/wp/v2/${restBase}/${termId}`, { seo_meta: payload });
  return res.data;
};
