/**
 * Universal field map for SEO plugins.
 * Yoast and generic plugins write via the standard WP `meta` key.
 * Rank Math and AIOSEO write via dedicated REST fields registered in the
 * bridge plugin — this ensures their internal hooks and custom tables are
 * updated correctly rather than bypassing them with raw post meta writes.
 */
export const META_FIELD_MAP = {
  yoast: {
    title: '_yoast_wpseo_title',
    description: '_yoast_wpseo_metadesc',
  },
  generic: {
    title: '_seo_title',
    description: '_seo_description',
  },
};

export const getMetaFields = (plugin) => META_FIELD_MAP[plugin] || META_FIELD_MAP.generic;

// Plugins that expose a dedicated REST field via the bridge plugin instead of
// writing through the standard `meta` object.
const REST_FIELD_PLUGINS = {
  rankmath: 'rankmath',
  aioseo:   'aioseo',
};

/**
 * Read current meta values for a post via the REST API.
 * Uses context=edit so meta is exposed to authenticated users.
 */
export const readPostMeta = async (wp, postType, postId, plugin) => {
  const res = await wp.get(`/wp-json/wp/v2/${postType}/${postId}`, {
    params: { context: 'edit' },
  });

  const restField = REST_FIELD_PLUGINS[plugin];
  if (restField) {
    const field = res.data?.[restField] || {};
    return {
      title:       field.title       || '',
      description: field.description || '',
    };
  }

  const fields = getMetaFields(plugin);
  const meta = res.data?.meta || {};
  return {
    title:       meta[fields.title]       || '',
    description: meta[fields.description] || '',
  };
};

/**
 * Write meta title + description to a post using the correct plugin strategy.
 *
 * - Yoast / generic  → standard WP `meta` object (keys registered show_in_rest=true)
 * - Rank Math        → `rankmath` REST field (bridge routes through RM's own API)
 * - AIOSEO           → `aioseo`   REST field (bridge routes through AIOSEO's custom table)
 *
 * Returns the updated WP post object.
 */
export const writePostMeta = async (wp, postType, postId, plugin, { title, description }) => {
  const restField = REST_FIELD_PLUGINS[plugin];

  if (restField) {
    const payload = {};
    if (title       !== undefined && title       !== null) payload.title       = title;
    if (description !== undefined && description !== null) payload.description = description;
    const res = await wp.post(`/wp-json/wp/v2/${postType}/${postId}`, { [restField]: payload });
    return res.data;
  }

  const fields = getMetaFields(plugin);
  const meta = {};
  if (title       !== undefined && title       !== null) meta[fields.title]       = title;
  if (description !== undefined && description !== null) meta[fields.description] = description;

  const res = await wp.post(`/wp-json/wp/v2/${postType}/${postId}`, { meta });
  return res.data;
};
