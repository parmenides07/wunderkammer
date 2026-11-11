// A route is a visitor's trail of globally unique canvas IDs, never a directory tree.
export const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const BASE = '/personal/';
export const routeURL = (trail = ['home'], base = BASE, edit = false) => `${base}${edit ? '?edit5500' : ''}#/${trail.join('/')}`;
export function visit(trail, slug) {
  const index = trail.indexOf(slug);
  return index < 0 ? [...trail, slug] : trail.slice(0, index + 1);
}
export function parseRoute(hash, known, legacy = {}) {
  let route;
  try { route = decodeURIComponent(hash.replace(/^#\/?/, '')) || 'home'; }
  catch { return { error: 'This personal URL is not valid.' }; }
  const migration = Object.hasOwn(legacy, route) ? legacy[route] : null;
  if (migration?.canvas) route = migration.canvas;
  const trail = route.split('/');
  if (trail.every(id => ID.test(id) && known.has(id)))
    return { trail: trail.reduce(visit, []), slug: trail.at(-1) };
  return { error: migration ? 'This older personal page has not been migrated to a canvas.' : 'This canvas or navigation trail does not exist.', migration };
}
export function internalTarget(value, base = BASE, origin = 'https://paramghetia.com') {
  let url;
  try { url = new URL(value, origin); } catch { return null; }
  if (url.origin !== origin) return null;
  if ([base, base + 'index.html', BASE, BASE + 'index.html'].includes(url.pathname)) {
    const ids = url.hash.replace(/^#\/?/, '').split('/');
    return !url.hash ? 'home' : ids.every(id => ID.test(id)) ? ids.at(-1) : null;
  }
  const match = url.pathname.match(/^\/(?:space|zibaldone|personal)\/(?:([a-z0-9-]+)\/)?$/);
  return match ? match[1] || 'home' : null;
}
export function canvasURL(value, trail = [], base = BASE, edit = false, origin = 'https://paramghetia.com') {
  const slug = internalTarget(value, base, origin);
  return slug ? routeURL(visit(trail, slug), base, edit) : value;
}
