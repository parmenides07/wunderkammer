/* Semantic queries are independent of directories and of the DOM. */
(function (root) {
  const comparePages = (a, b) => a.order - b.order || a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
  function createContentModel(manifest, audience) {
    // Filter FIRST. Every lookup, group, topic query and traversal shares this universe.
    const pages = manifest.pages.filter(page => page.published && page.audience.includes(audience)).sort(comparePages);
    const bySlug = new Map(pages.map(page => [page.slug, page]));
    const byId = new Map(pages.map(page => [page.id, page]));
    return {
      pages, bySlug, byId,
      resolve(route) { return bySlug.get(manifest.aliases[route] || route); },
      topic(topic) { return pages.filter(page => page.topics.includes(topic)); },
      assets: manifest.assetDirectories
    };
  }
  const api = { createContentModel, comparePages };
  if (typeof module !== 'undefined') module.exports = api;
  else root.SiteContent = api;
})(globalThis);
