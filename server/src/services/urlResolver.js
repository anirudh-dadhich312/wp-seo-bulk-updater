// Order matters: most common first.
const POST_TYPES = ['posts', 'pages', 'product'];

/**
 * Extract a slug from a full post URL.
 * https://site.com/category/best-shoes/  -> "best-shoes"
 */
export const extractSlug = (url) => {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] || '';
  } catch {
    return String(url).replace(/\/$/, '').split('/').pop() || '';
  }
};

/**
 * Resolve a post URL to { id, type, slug } by searching by slug across known post types.
 * Throws if no match is found.
 */
export const resolvePostFromUrl = async (wp, postUrl) => {
  const slug = extractSlug(postUrl);
  if (!slug) throw new Error(`Could not extract slug from URL: ${postUrl}`);

  for (const type of POST_TYPES) {
    try {
      const res = await wp.get(`/wp-json/wp/v2/${type}`, {
        params: { slug, _fields: 'id,link,slug', context: 'edit' },
      });
      if (Array.isArray(res.data) && res.data.length > 0) {
        return { id: res.data[0].id, type, slug };
      }
    } catch (err) {
      // 404 = post type not registered on this site (e.g., 'product' on a non-Woo site)
      // Any other status we surface only if we never find a match.
      if (err.response?.status && err.response.status !== 404) {
        // keep trying other types
      }
    }
  }

  throw new Error(`Post not found for URL: ${postUrl}`);
};
