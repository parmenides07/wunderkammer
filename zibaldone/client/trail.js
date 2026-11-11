import { routeURL, internalTarget } from './routes.js';
export const pageLabel = page => (typeof page.title === 'string' && page.title.trim() ||
  typeof page.displayName === 'string' && page.displayName.trim() || page.slug.replaceAll('-', ' ')).toLowerCase();
export function visitTrail(trail, page) {
  const entry = { slug: page.slug, label: pageLabel(page) }, index = trail.findIndex(item => item.slug === page.slug);
  return index < 0 ? [...trail, entry] : [...trail.slice(0, index), entry];
}
export const internalPage = internalTarget;

// The hash is the complete trail. Refreshes and new tabs need no hidden session
// state; history traversal restores the hash without appending another visit.
export function createTrail(ids, base, catalog) {
  const nav = document.querySelector('#breadcrumbs'), list = nav.querySelector('ol');
  const editor = !!document.querySelector('meta[name=zibaldone-editor-token]');
  let guard = () => true, index = history.state?.zibaldoneIndex || 0, returning = false;
  let currentURL = location.pathname + location.search + (location.hash || '#/home');
  history.replaceState({ ...history.state, zibaldoneIndex: index }, '', currentURL);
  const api = {
    ids, departing: false,
    setGuard(value) { guard = value; },
    setRoute(next, pages) {
      ids = next; api.ids = next; catalog = pages;
      if (ids.length) {
        currentURL = location.pathname + location.search + '#/' + ids.join('/');
        history.replaceState({ ...history.state, zibaldoneIndex: index }, '', currentURL);
      }
      render();
    },
    load: () => {},
    navigate(href, approved = false) {
      const url = new URL(href, location.href);
      if (url.href === location.href) return true;
      if (!approved && !guard()) return false;
      index++; currentURL = url.pathname + url.search + url.hash;
      history.pushState({ zibaldoneIndex: index }, '', url);
      api.load(url.hash);
      return true;
    },
    setPage(page) { catalog.set(page.slug, page); render(); },
  };
  function render() {
    list.replaceChildren(...ids.map((slug, i) => {
      const item = document.createElement('li');
      if (i) { const separator = document.createElement('span'); separator.textContent = '/'; separator.className = 'trail-separator'; separator.setAttribute('aria-hidden', 'true'); item.append(separator); }
      const label = document.createElement(i === ids.length - 1 ? 'span' : 'a');
      label.textContent = pageLabel(catalog.get(slug) || { slug });
      if (i === ids.length - 1) label.setAttribute('aria-current', 'page');
      else label.href = routeURL(ids.slice(0, i + 1), base, editor);
      item.append(label); return item;
    }));
    nav.scrollLeft = nav.scrollWidth;
  }
  render();
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || link.hasAttribute('download') || link.target && link.target !== '_self') return;
    const url = new URL(link.href);
    if (url.origin !== location.origin || url.pathname !== base || !url.hash.startsWith('#/')) return;
    event.preventDefault(); api.navigate(url);
  });
  const changed = () => {
    const url = location.pathname + location.search + location.hash;
    if (returning) { if (url === currentURL) returning = false; return; }
    if (url === currentURL) return;
    const next = history.state?.zibaldoneIndex;
    if (!guard()) {
      if (Number.isInteger(next) && next !== index) { returning = true; history.go(index - next); }
      else history.replaceState({ zibaldoneIndex: index }, '', currentURL);
      return;
    }
    index = next === index || next === undefined ? index + 1 : next;
    history.replaceState({ zibaldoneIndex: index }, '');
    currentURL = location.pathname + location.search + location.hash;
    api.load(location.hash);
  };
  window.addEventListener('popstate', changed);
  window.addEventListener('hashchange', changed);
  return api;
}
