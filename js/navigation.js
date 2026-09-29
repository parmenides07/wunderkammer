(function (root) {
  function createNavigation(model, config, audience) {
    const titleCase = value => value.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const catalog = new Map();
    const pageGroups = new Map();
    const sections = config.sections.flatMap(section => {
      const pages = model.pages.filter(page => page.section === section.id);
      if (!pages.length) return [];
      const node = { key: section.id, label: audience === 'professional' ? section.professionalLabel || section.label : section.label, pages, children: [] };
      catalog.set(node.key, node);
      const field = section.id === 'projects' ? 'project' : 'collection';
      const settings = field === 'project' ? config.projects : config.collections;
      const groups = [...new Set(pages.map(page => page[field]).filter(Boolean))];
      const rank = id => { const i = settings.findIndex(item => item.id === id); return i < 0 ? settings.length : i; };
      groups.sort((a,b) => rank(a)-rank(b) || a.localeCompare(b));
      node.children = groups.map(id => {
        const group = { key: `${section.id}/${id}`, label: settings.find(item => item.id === id)?.label || titleCase(id), pages: pages.filter(page => page[field] === id), children: [] };
        catalog.set(group.key, group);
        group.pages.forEach(page => pageGroups.set(page.id, group));
        return group;
      });
      pages.forEach(page => { if (!pageGroups.has(page.id)) pageGroups.set(page.id, node); });
      // Next-page order follows visible group order, with ungrouped entries first.
      node.pages = [...pages.filter(page => !page[field]), ...node.children.flatMap(group => group.pages)];
      return [node];
    });
    return { sections, catalog, pageGroups };
  }
  if (typeof module !== 'undefined') module.exports = { createNavigation };
  else root.SiteNavigation = { createNavigation };
})(globalThis);
