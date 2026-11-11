import { routeURL } from './routes.js';
export const GRID = 24;
export const MIN_ZOOM = 0.08;
export const MAX_ZOOM = 8;
export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const pageURL = (slug, base = '/personal/', edit = false) => routeURL([slug], base, edit);
export function normalizeBasePath(value = '/personal/') {
  if (typeof value !== 'string' || (!/^\/(?:[a-zA-Z0-9_.-]+\/)+$/.test(value) || value.split('/').some(part => part === '.' || part === '..')))
    throw new Error('ZIBALDONE_BASE_PATH must be an absolute path with a trailing slash, e.g. /repository/personal/.');
  return value;
}
// Saved Space compositions retain their original links and image paths.
export const spaceURL = (value, base = '/personal/') => value.replace(/^\/(?:space|zibaldone|personal)\//, base);
export const snap = (value, enabled = true) => enabled ? Math.round(value) + 0 : value;
export const clampZoom = z => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
export const isMaximizable = e => e.type !== 'line' && e.maximizable !== false;
export const isInteractive = e => e.type !== 'line' && (!!e.href || isMaximizable(e));
export const canInvert = e => e.type === 'text' && e.invertOnHover === true && isInteractive(e);
export const linePoints = e => e.points ?? [[e.x1, e.y1], [e.x2, e.y2]];
export function setLinePoints(e, points) {
  e.points = points.map(p => [...p]);
  for (const key of ['x1', 'y1', 'x2', 'y2']) delete e[key];
}
export function elementBounds(e) {
  if (e.type !== 'line') return e;
  const points = linePoints(e), xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}
export function translateElement(e, dx, dy) {
  if (e.type !== 'line') { e.x += dx; e.y += dy; }
  else if (e.points) e.points = e.points.map(([x, y]) => [x + dx, y + dy]);
  else { e.x1 += dx; e.x2 += dx; e.y1 += dy; e.y2 += dy; }
  return e;
}
export function routeSegment(from, to, mode = 'orthogonal', horizontalFirst = true) {
  const points = [from];
  if (mode === 'orthogonal') points.push(horizontalFirst ? [to[0], from[1]] : [from[0], to[1]]);
  points.push(to);
  return points.filter((p, i) => !i || p[0] !== points[i - 1][0] || p[1] !== points[i - 1][1]);
}
export function nearestSegment(points, point) {
  let nearest = { distance: Infinity, index: 0, point: points[0] };
  for (let i = 0; i < points.length - 1; i++) {
    const [x, y] = points[i], dx = points[i + 1][0] - x, dy = points[i + 1][1] - y;
    const t = Math.max(0, Math.min(1, ((point[0] - x) * dx + (point[1] - y) * dy) / (dx * dx + dy * dy || 1)));
    const projected = [x + t * dx, y + t * dy], distance = Math.hypot(point[0] - projected[0], point[1] - projected[1]);
    if (distance < nearest.distance) nearest = { distance, index: i, point: projected };
  }
  return nearest;
}
export function intersectsRect(e, rect) {
  const b = elementBounds(e);
  if (b.x > rect.x + rect.width || b.x + b.width < rect.x || b.y > rect.y + rect.height || b.y + b.height < rect.y) return false;
  if (e.type !== 'line') return true;
  const points = linePoints(e);
  return points.slice(1).some((end, i) => {
    const start = points[i]; let low = 0, high = 1;
    for (let axis = 0; axis < 2; axis++) {
      const min = axis ? rect.y : rect.x, max = min + (axis ? rect.height : rect.width), delta = end[axis] - start[axis];
      if (!delta) { if (start[axis] < min || start[axis] > max) return false; }
      else { const a = (min - start[axis]) / delta, b = (max - start[axis]) / delta; low = Math.max(low, Math.min(a, b)); high = Math.min(high, Math.max(a, b)); }
    }
    return low <= high;
  });
}

export function screenToWorld(point, camera, size) {
  return {
    x: camera.x + (point.x - size.width / 2) / (GRID * camera.zoom),
    y: camera.y + (point.y - size.height / 2) / (GRID * camera.zoom),
  };
}

export function zoomAt(camera, point, size, zoom) {
  const anchor = screenToWorld(point, camera, size);
  zoom = clampZoom(zoom);
  return {
    x: anchor.x - (point.x - size.width / 2) / (GRID * zoom),
    y: anchor.y - (point.y - size.height / 2) / (GRID * zoom),
    zoom,
  };
}

export function resizeBox(start, dx, dy, snapped, lockAspect = false) {
  const minimum = snapped ? 1 : 0.1;
  const width = Math.max(minimum, snap(start.width + dx, snapped));
  const height = Math.max(minimum, snap(start.height + dy, snapped));
  if (!lockAspect) return { width, height };
  // Snap the dominant axis; derive the other exactly to avoid image distortion.
  const ratio = start.width / start.height;
  return Math.abs(dx / start.width) >= Math.abs(dy / start.height)
    ? { width, height: width / ratio }
    : { width: height * ratio, height };
}

export function validHref(href) {
  return typeof href === 'string' && href.length <= 2048 &&
    (/^\/(?:space|zibaldone|personal)\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/)?$/.test(href) ||
      /^\/personal\/#\/[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(href) ||
      /^(https?:\/\/|mailto:|tel:)[^\s]+$/i.test(href));
}

export function validatePage(page, expectedSlug = page?.slug) {
  const fail = message => { throw new Error(message); };
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  if (!page || !slugPattern.test(page.slug) || page.slug.length > 80 || page.slug !== expectedSlug)
    fail('Use a slug of lowercase letters, numbers, and single hyphens (maximum 80 characters).');
  if (['assets', 'client', 'pages'].includes(page.slug)) fail('That slug is reserved.');
  const c = page.camera;
  if (!c || !finite(c.x) || !finite(c.y) || !finite(c.zoom) || c.zoom < MIN_ZOOM || c.zoom > MAX_ZOOM)
    fail('Camera needs finite x/y coordinates and a zoom between 0.08 and 8.');
  if (!Array.isArray(page.elements) || page.elements.length > 2000) fail('A page supports up to 2000 objects.');
  const ids = new Set();
  for (const e of page.elements) {
    if (!e || typeof e.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(e.id) || ids.has(e.id))
      fail('Every object needs a unique, simple ID.');
    ids.add(e.id);
    if (!['text', 'image', 'line'].includes(e.type)) fail('Object type must be text, image, or line.');
    if (e.zIndex !== undefined && (!Number.isInteger(e.zIndex) || Math.abs(e.zIndex) > 2147483647))
      fail('Z-index must be an integer between -2147483647 and 2147483647.');
    if (e.locked !== undefined && typeof e.locked !== 'boolean') fail('locked must be boolean.');
    if (e.type === 'line') {
      if (e.points !== undefined) {
        if (!Array.isArray(e.points) || e.points.length < 2 || e.points.length > 1000 ||
          !e.points.every(p => Array.isArray(p) && p.length === 2 && p.every(finite))) fail('A polyline needs 2–1000 finite world-space points.');
      } else if (!['x1', 'y1', 'x2', 'y2'].every(k => finite(e[k]))) fail('Line endpoints must be finite world coordinates.');
      if (e.strokeStyle !== undefined && !['solid', 'dashed', 'dotted'].includes(e.strokeStyle)) fail('Invalid line stroke style.');
      if (e.strokeWidth !== undefined && (!finite(e.strokeWidth) || e.strokeWidth <= 0 || e.strokeWidth > 100)) fail('Stroke width must be greater than 0 and at most 100 pixels.');
      if (e.arrowhead !== undefined && typeof e.arrowhead !== 'boolean') fail('arrowhead must be boolean.');
      if (e.href !== undefined) fail('Links are supported on text and images only.');
      continue;
    }
    if (!['x', 'y', 'width', 'height'].every(k => finite(e[k])) || e.width <= 0 || e.height <= 0)
      fail('Object coordinates must be finite; width and height must be positive.');
    if (e.maximizable !== undefined && typeof e.maximizable !== 'boolean') fail('maximizable must be boolean.');
    if (e.shadow !== undefined && typeof e.shadow !== 'boolean') fail('shadow must be boolean.');
    if (e.href !== undefined && !validHref(e.href)) fail('Links must be /zibaldone/ URLs, http(s), mailto, or tel URLs.');
    if (e.type === 'text') {
      if (e.lineHeight !== undefined && (!finite(e.lineHeight) || e.lineHeight < 0.5 || e.lineHeight > 4)) fail('Line height must be between 0.5 and 4.');
      if (e.letterSpacing !== undefined && (!finite(e.letterSpacing) || e.letterSpacing < -0.1 || e.letterSpacing > 1)) fail('Letter spacing must be between -0.1 and 1 em.');
      if (e.invertOnHover !== undefined && typeof e.invertOnHover !== 'boolean') fail('invertOnHover must be boolean.');
      if (typeof e.text !== 'string' || e.text.length > 100000) fail('Text must be at most 100000 characters.');
      if (!['mono', 'baskerville'].includes(e.font)) fail('Choose mono or baskerville.');
      if (!finite(e.fontSize) || e.fontSize < 1 || e.fontSize > 1000) fail('Font size must be between 1 and 1000 pixels.');
      if (e.align !== undefined && !['left', 'center', 'right'].includes(e.align)) fail('Invalid text alignment.');
    } else {
      if (typeof e.src !== 'string' || !/^\/(?:space|zibaldone|personal)\/assets\/[a-zA-Z0-9_-]+\.(png|jpe?g|webp|gif)$/i.test(e.src))
        fail('Images must reference normal files in /personal/assets/.');
      if (typeof e.alt !== 'string' || e.alt.length > 4000) fail('An image needs an alt text string.');
      if (e.lockAspect !== undefined && typeof e.lockAspect !== 'boolean') fail('lockAspect must be boolean.');
    }
  }
  return page;
}
