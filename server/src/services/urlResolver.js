// Static post types to try first (fastest, most common)
const STATIC_POST_TYPES = ['posts', 'pages', 'product', 'portfolio', 'service', 'team'];

/**
 * Extract the final non-empty path segment as the slug.
 * https://site.com/2019/06/my-post/ → "my-post"
 * https://site.com/topics/category/  → "category"
 */
export const extractSlug = (url) => {
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] || '';
  } catch {
    return String(url).replace(/\/$/, '').split('/').pop() || '';
  }
};

/**
 * Fetch the list of custom post types registered on the WP site that expose
 * a REST base, excluding the static types we already try.
 * Returns an array of rest_base strings.
 */
const discoverCustomPostTypes = async (wp) => {
  try {
    const res = await wp.get('/wp-json/wp/v2/types', {
      params: { context: 'edit' },
      timeout: 8000,
    });
    return Object.values(res.data || {})
      .filter((t) => t.rest_base && !STATIC_POST_TYPES.includes(t.rest_base))
      .map((t) => t.rest_base);
  } catch {
    return [];
  }
};

/**
 * Fetch the list of public taxonomies registered on the WP site.
 * Returns an array of { name, restBase } objects.
 */
const discoverTaxonomies = async (wp) => {
  try {
    const res = await wp.get('/wp-json/wp/v2/taxonomies', { timeout: 8000 });
    return Object.values(res.data || {})
      .filter((t) => t.rest_base)
      .map((t) => ({ name: t.slug, restBase: t.rest_base }));
  } catch {
    return [];
  }
};

/**
 * Search a single post type for a slug.
 * First tries with status=any + edit context (requires edit_posts capability).
 * Falls back to a public query without status=any for restricted users.
 * Returns the post object or null.
 */
const findPostBySlug = async (wp, restBase, slug) => {
  // Primary: authenticated edit query — sees all statuses
  try {
    const res = await wp.get(`/wp-json/wp/v2/${restBase}`, {
      params: { slug, status: 'any', _fields: 'id,slug,link', context: 'edit' },
    });
    if (Array.isArray(res.data) && res.data.length > 0) return res.data[0];
  } catch {
    // 404 = post type not registered, 403 = no edit cap → fallback below
  }

  // Fallback: public query without status restriction (works for lower-permission users)
  try {
    const res = await wp.get(`/wp-json/wp/v2/${restBase}`, {
      params: { slug, _fields: 'id,slug,link' },
    });
    if (Array.isArray(res.data) && res.data.length > 0) return res.data[0];
  } catch {
    // 404 = post type definitely not registered; skip
  }

  return null;
};

/**
 * Search a taxonomy for a term with the given slug.
 * Returns the term object or null.
 */
const findTermBySlug = async (wp, restBase, slug) => {
  try {
    const res = await wp.get(`/wp-json/wp/v2/${restBase}`, {
      params: { slug, _fields: 'id,slug,link' },
    });
    if (Array.isArray(res.data) && res.data.length > 0) return res.data[0];
  } catch {}
  return null;
};

/**
 * Resolve a post/page/term URL to an object describing how to update it.
 *
 * Returns one of:
 *   { kind: 'post', id, type }          — standard post/page/CPT
 *   { kind: 'term', id, taxonomy, restBase } — category/tag/custom taxonomy term
 *
 * Throws if no match is found.
 */
export const resolvePostFromUrl = async (wp, postUrl) => {
  const slug = extractSlug(postUrl);
  if (!slug) throw new Error(`Could not extract slug from URL: ${postUrl}`);

  // --- 1. Static post types (includes status=any for draft/scheduled) ---
  for (const restBase of STATIC_POST_TYPES) {
    const post = await findPostBySlug(wp, restBase, slug);
    if (post) return { kind: 'post', id: post.id, type: restBase };
  }

  // --- 2. Dynamically discovered custom post types ---
  const customTypes = await discoverCustomPostTypes(wp);
  for (const restBase of customTypes) {
    const post = await findPostBySlug(wp, restBase, slug);
    if (post) return { kind: 'post', id: post.id, type: restBase };
  }

  // --- 3. Taxonomy terms (categories, tags, custom taxonomies) ---
  const taxonomies = await discoverTaxonomies(wp);
  for (const tax of taxonomies) {
    const term = await findTermBySlug(wp, tax.restBase, slug);
    if (term) return { kind: 'term', id: term.id, taxonomy: tax.name, restBase: tax.restBase };
  }

  throw new Error(`Post not found for URL: ${postUrl}`);
};
