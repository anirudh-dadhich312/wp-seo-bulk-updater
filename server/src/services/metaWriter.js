/**
 * Universal field map for SEO plugins.
 * The bridge mu-plugin must register these meta keys with show_in_rest=true
 * for the WP REST API to accept reads/writes for them.
 */
export const META_FIELD_MAP = {
  yoast: {
    title: '_yoast_wpseo_title',
    description: '_yoast_wpseo_metadesc',
  },
  rankmath: {
    title: 'rank_math_title',
    description: 'rank_math_description',
  },
  aioseo: {
    title: '_aioseo_title',
    description: '_aioseo_description',
  },
  generic: {
    title: '_seo_title',
    description: '_seo_description',
  },
};

export const getMetaFields = (plugin) => META_FIELD_MAP[plugin] || META_FIELD_MAP.generic;

/**
 * Read current meta values for a post via the REST API.
 * Uses context=edit so meta is exposed to authenticated users.
 */
export const readPostMeta = async (wp, postType, postId, plugin) => {
  const fields = getMetaFields(plugin);
  const res = await wp.get(`/wp-json/wp/v2/${postType}/${postId}`, {
    params: { context: 'edit' },
  });
  const meta = res.data?.meta || {};
  return {
    title: meta[fields.title] || '',
    description: meta[fields.description] || '',
  };
};

/**
 * Write meta title + description to a post using the correct plugin field keys.
 * Returns the updated WP post object.
 */
export const writePostMeta = async (wp, postType, postId, plugin, { title, description }) => {
  const fields = getMetaFields(plugin);
  const meta = {};
  if (title !== undefined && title !== null) meta[fields.title] = title;
  if (description !== undefined && description !== null) meta[fields.description] = description;

  const res = await wp.post(`/wp-json/wp/v2/${postType}/${postId}`, { meta });
  return res.data;
};
