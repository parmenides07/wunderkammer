import { GRID, validatePage, elementBounds, linePoints, isMaximizable, isInteractive, canInvert, spaceURL } from './model.js';
import { Camera } from './camera.js';
import { parseRoute, canvasURL, routeURL } from './routes.js';
import { createTrail } from './trail.js';

export const fonts = {
  mono: '"JetBrains Mono", monospace',
  baskerville: 'Baskerville, "Baskerville Old Face", "Palatino Linotype", "Book Antiqua", Georgia, serif',
};

export function styleObject(node, element) {
  const box = elementBounds(element);
  Object.assign(node.style, {
    left: `${box.x * GRID}px`, top: `${box.y * GRID}px`,
    width: `${element.type === 'line' ? Math.max(1, box.width * GRID) : box.width * GRID}px`,
    height: `${element.type === 'line' ? Math.max(1, box.height * GRID) : box.height * GRID}px`,
    zIndex: element.zIndex ?? 0,
    fontFamily: fonts[element.font] || fonts.mono,
    fontSize: `${element.fontSize || 16}px`, textAlign: element.align || 'left',
    lineHeight: element.lineHeight ?? 1.4, letterSpacing: `${element.letterSpacing ?? 0}em`,
    boxShadow: element.type !== 'line' && element.shadow ? '0 4px 14px rgba(0,0,0,0.09)' : 'none',
  });
}

function svgNode(tag, attributes) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  return node;
}

function updateLine(node, element) {
  const box = elementBounds(element);
  const points = linePoints(element).map(([x, y]) => `${(x - box.x) * GRID},${(y - box.y) * GRID}`).join(' ');
  for (const line of node.querySelectorAll('polyline')) line.setAttribute('points', points);
  const ink = node.querySelector('.line-ink');
  const width = element.strokeWidth ?? 1;
  ink.setAttribute('stroke-width', width);
  ink.setAttribute('stroke-dasharray', element.strokeStyle === 'dashed' ? `${6 * width} ${4 * width}` : element.strokeStyle === 'dotted' ? `0 ${3 * width}` : 'none');
  ink.setAttribute('stroke-linecap', element.strokeStyle === 'dotted' ? 'round' : 'butt');
  ink.setAttribute('marker-end', element.arrowhead && (box.width || box.height) ? `url(#${node.querySelector('marker').id})` : 'none');
}

export class Space {
  constructor(page, revision, trail) {
    this.trail = trail;
    this.page = page;
    this.base = document.documentElement.dataset.spaceBase || '/personal/';
    this.revision = revision;
    this.viewport = document.querySelector('#viewport');
    this.world = document.querySelector('#world');
    this.nodes = new Map();
    this.camera = new Camera(this.viewport, this.world, page.camera);
    this.camera.onChange = () => this.updateFocusControls();
    this.world.addEventListener('pointerover', event => {
      this.hoveredAsset = event.pointerType !== 'touch' && matchMedia('(any-hover: hover)').matches
        ? event.target.closest('.object') : null;
      this.updateAssetFeedback();
    });
    this.world.addEventListener('pointerout', event => {
      if (!this.hoveredAsset?.contains(event.relatedTarget)) {
        this.hoveredAsset = null;
        this.updateAssetFeedback();
      }
    });
    this.world.addEventListener('focusin', () => this.updateAssetFeedback());
    this.world.addEventListener('focusout', () => queueMicrotask(() => this.updateAssetFeedback()));
    this.dialog = document.querySelector('#focus-view');
    document.querySelector('#close-focus').addEventListener('click', () => this.dialog.close());
    this.dialog.addEventListener('close', () => {
      document.querySelector('#focus-content').replaceChildren();
      this.focusReturn?.focus({ preventScroll: true });
    });
    // The editor token is available before editor.js starts: never briefly wrap
    // the local authoring camera while its module is loading.
    if (!document.querySelector('meta[name=zibaldone-editor-token]')) {
      this.camera.panBounds = () => !this.editing && !this.dialog.open ? this.bounds : null;
      this.boundsObserver = new ResizeObserver(() => this.invalidateBounds());
      this.world.addEventListener('load', () => this.invalidateBounds(), true);
      document.fonts.ready.then(() => this.invalidateBounds());
      document.fonts.addEventListener('loadingdone', () => this.invalidateBounds());
    }
    this.render();
    document.title = `${page.slug === 'home' ? 'A place in space' : page.slug.replaceAll('-', ' ')} — Zibaldone`;
  }
  render() {
    this.nodes.clear();
    this.world.replaceChildren(...this.page.elements.map(element => this.makeObject(element)));
    this.updateFocusControls();
    if (this.boundsObserver) {
      this.boundsObserver.disconnect(); this.boundsObserver.observe(this.viewport);
      for (const node of this.nodes.values()) this.boundsObserver.observe(node.querySelector('.content') || node);
      this.invalidateBounds();
    }
  }
  invalidateBounds() {
    if (!this.boundsObserver) return;
    this.bounds = null; // Never wrap using stale geometry while layout settles.
    cancelAnimationFrame(this.boundsFrame);
    this.boundsFrame = requestAnimationFrame(() => { this.bounds = this.measureBounds(); });
  }
  measureBounds() {
    if (!this.page.elements.length) return null;
    const origin = this.world.getBoundingClientRect(), scale = GRID * this.camera.value.zoom;
    const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    for (const element of this.page.elements) {
      const node = this.nodes.get(element.id), box = elementBounds(element);
      let left = box.x * GRID, top = box.y * GRID, right = left + box.width * GRID, bottom = top + box.height * GRID;
      let margin = 6; // Focus outlines, glyph overhang and antialiasing.
      if (element.type === 'line') {
        // Default SVG miter joins and the rotated 8×8 stroke-unit arrow marker.
        margin += (element.arrowhead ? 9 : 4) * (element.strokeWidth ?? 1);
      } else {
        if (element.type === 'text') {
          const content = node.querySelector('.content'), range = document.createRange();
          range.selectNodeContents(content);
          const text = range.getBoundingClientRect();
          if (text.width || text.height) {
            left = Math.min(left, (text.left - origin.left) / this.camera.value.zoom);
            top = Math.min(top, (text.top - origin.top) / this.camera.value.zoom);
            right = Math.max(right, (text.right - origin.left) / this.camera.value.zoom);
            bottom = Math.max(bottom, (text.bottom - origin.top) / this.camera.value.zoom);
          }
          right = Math.max(right, box.x * GRID + content.scrollWidth);
          bottom = Math.max(bottom, box.y * GRID + content.scrollHeight);
          margin = Math.max(margin, element.fontSize * 0.25);
        } else if (isInteractive(element)) {
          left -= box.width * GRID * 0.01; right += box.width * GRID * 0.01;
          top -= box.height * GRID * 0.01; bottom += box.height * GRID * 0.01;
        }
        if (element.shadow) margin += 32;
        // These controls belong to the asset, not the fixed viewport UI. Reserve
        // their largest size even when hidden so focus/hover cannot expose a seam.
        if (node.querySelector('.focus-object')) {
          right = Math.max(right, (box.x + box.width) * GRID + 40);
          bottom = Math.max(bottom, box.y * GRID + 40);
        }
      }
      bounds.minX = Math.min(bounds.minX, (left - margin) / GRID);
      bounds.minY = Math.min(bounds.minY, (top - margin) / GRID);
      bounds.maxX = Math.max(bounds.maxX, (right + margin) / GRID);
      bounds.maxY = Math.max(bounds.maxY, (bottom + margin) / GRID);
    }
    return scale > 0 && Object.values(bounds).every(Number.isFinite) ? bounds : null;
  }
  makeObject(element) {
    const node = document.createElement('article');
    node.className = `object ${element.type}-object`;
    node.dataset.id = element.id;
    node.dataset.interactive = isInteractive(element);
    node.classList.toggle('inverts', canInvert(element));
    styleObject(node, element);
    if (element.type === 'line') {
      node.setAttribute('aria-hidden', 'true');
      const svg = svgNode('svg', { class: 'line-drawing', width: '100%', height: '100%', 'aria-hidden': 'true' });
      const defs = svgNode('defs', {});
      const marker = svgNode('marker', { id: `arrow-${this.page.slug}-${element.id}`, viewBox: '0 0 8 8', refX: 8, refY: 4, markerWidth: 8, markerHeight: 8, orient: 'auto' });
      marker.append(svgNode('path', { d: 'M0 0 L8 4 L0 8 Z', fill: 'currentColor' }));
      defs.append(marker);
      svg.append(defs, svgNode('polyline', { class: 'line-ink', stroke: 'currentColor', fill: 'none' }),
        svgNode('polyline', { class: 'line-hit', stroke: 'transparent', fill: 'none', 'stroke-width': 14, 'vector-effect': 'non-scaling-stroke' }));
      node.append(svg);
      updateLine(node, element);
      this.nodes.set(element.id, node);
      return node;
    }
    const content = document.createElement(element.href ? 'a' : 'div');
    content.className = 'content';
    if (element.href) content.href = canvasURL(element.href, this.trail.ids, this.base, false, location.origin);
    else if (isMaximizable(element)) {
      content.tabIndex = 0;
      content.setAttribute('role', 'button');
      content.setAttribute('aria-haspopup', 'dialog');
    }
    if (element.type === 'text') content.textContent = element.text;
    else {
      const img = document.createElement('img');
      img.src = spaceURL(element.src, this.base);
      img.alt = element.alt;
      img.draggable = false;
      img.style.objectFit = element.lockAspect === false ? 'fill' : 'contain';
      content.append(img);
    }
    content.addEventListener('click', e => {
      if (this.editing) { e.preventDefault(); return; }
      if (!element.href) this.focus(element, content);
    });
    content.addEventListener('keydown', e => {
      if (!this.editing && !element.href && e.key === 'Enter') { e.preventDefault(); this.focus(element, content); }
    });
    content.addEventListener('dragstart', e => e.preventDefault());
    node.append(content);
    if (element.href && isMaximizable(element)) {
      const focus = document.createElement('button');
      focus.className = 'focus-object';
      focus.textContent = '↗';
      focus.title = 'View in isolation';
      focus.setAttribute('aria-label', `View ${element.type === 'image' ? element.alt || 'image' : element.text.slice(0, 60) || 'text'} in isolation`);
      focus.addEventListener('click', () => this.focus(element, focus));
      node.append(focus);
    }
    this.nodes.set(element.id, node);
    return node;
  }
  updateFocusControls() {
    const size = matchMedia('(pointer: coarse)').matches ? 40 : 30;
    for (const button of this.world.querySelectorAll('.focus-object')) {
      const box = button.parentElement.style;
      // Keep the arrow in world space, but remove unusably small targets from
      // both pointer hit testing and keyboard navigation.
      button.hidden = Math.min(size, parseFloat(box.width), parseFloat(box.height)) * this.camera.value.zoom < 24;
    }
  }
  update(element) {
    const node = this.nodes.get(element.id);
    styleObject(node, element);
    if (element.type === 'line') updateLine(node, element);
    this.updateAssetFeedback();
    this.invalidateBounds();
  }
  updateAssetFeedback() {
    const active = document.activeElement;
    const focused = this.world.contains(active) && active.matches(':focus-visible') ? active.closest('.object') : null;
    const node = this.hoveredAsset?.isConnected ? this.hoveredAsset : focused;
    const element = !this.editing && this.page.elements.find(e => e.id === node?.dataset.id);
    if (!element || !canInvert(element)) { delete this.viewport.dataset.feedback; return; }
    for (const key of ['x', 'y', 'width', 'height']) this.viewport.style.setProperty(`--asset-${key}`, element[key]);
    this.viewport.dataset.feedback = element.id;
  }
  focus(element, returnTo = document.activeElement) {
    if (!isMaximizable(element)) return;
    this.camera.releaseSpace();
    this.focusReturn = returnTo;
    const container = document.querySelector('#focus-content');
    container.className = element.type === 'image' ? 'focus-image' : 'focus-text';
    if (element.type === 'image') {
      const img = document.createElement('img');
      img.src = spaceURL(element.src, this.base);
      img.alt = element.alt;
      container.replaceChildren(img);
    } else {
      const text = document.createElement('div');
      text.textContent = element.text;
      text.style.fontFamily = fonts[element.font];
      text.style.fontSize = `${Math.max(16, Math.min(32, element.fontSize))}px`;
      text.style.textAlign = element.align || 'left';
      text.style.lineHeight = element.lineHeight ?? 1.6;
      text.style.letterSpacing = `${element.letterSpacing ?? 0}em`;
      container.replaceChildren(text);
    }
    this.dialog.showModal();
    this.dialog.scrollTop = 0;
    document.querySelector('#close-focus').focus({ preventScroll: true });
  }
}

export const ready = new Promise(resolve => {
  const base = document.documentElement.dataset.spaceBase || '/personal/';
  const trail = createTrail([], base, new Map());
  let app, request = 0;
  trail.load = async hash => {
    const sequence = ++request;
    document.documentElement.dataset.loading = 'true';
    app?.routePending?.(true);
    try {
      const catalogResponse = await fetch(`${base}catalog.json`, { cache: 'no-cache' });
      if (!catalogResponse.ok) throw new Error('Could not load the canvas index.');
      const catalog = await catalogResponse.json(), pages = new Map(catalog.pages.map(page => [page.slug, page]));
      const route = parseRoute(hash, new Set(pages.keys()), catalog.legacy);
      if (sequence !== request) return;
      const notice = document.querySelector('#notice');
      if (route.error) {
        if (app) app.invalid = true;
        app?.beforePageChange?.();
        document.querySelector('#viewport').hidden = true;
        for (const id of ['editor-tools', 'properties']) { const node = document.getElementById(id); if (node) node.hidden = true; }
        trail.setRoute([], pages); notice.replaceChildren(document.createTextNode(route.error + ' ')); notice.hidden = false;
        if (route.migration?.professional) {
          const link = document.createElement('a'); link.href = route.migration.professional;
          link.textContent = 'Read the existing professional page'; notice.append(link, document.createTextNode(' · '));
        }
        const home = document.createElement('a'); home.href = routeURL(['home'], base, !!document.querySelector('meta[name=zibaldone-editor-token]')); home.textContent = 'Open home'; notice.append(home);
        return;
      }
      const response = await fetch(`${base}pages/${route.slug}.json`, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`Could not open this space (${response.status}).`);
      const page = validatePage(await response.json(), route.slug);
      if (sequence !== request) return;
      app?.beforePageChange?.();
      trail.setRoute(route.trail, pages); notice.hidden = true; notice.replaceChildren();
      document.querySelector('#viewport').hidden = false;
      if (!app) { app = new Space(page, response.headers.get('ETag'), trail); resolve(app); }
      else {
        app.dialog.close(); app.page = page; app.revision = response.headers.get('ETag');
        app.hoveredAsset = null; app.render(); app.camera.set(page.camera); app.updateAssetFeedback();
        app.afterPageChange?.();
      }
      app.invalid = false; document.documentElement.dataset.slug = page.slug;
      document.title = `${page.slug === 'home' ? 'A place in space' : page.slug.replaceAll('-', ' ')} — Zibaldone`;
    } catch (error) {
      if (sequence === request) { const notice = document.querySelector('#notice'); notice.hidden = false; notice.textContent = error.message; }
    } finally { if (sequence === request) { delete document.documentElement.dataset.loading; app?.routePending?.(false); } }
  };
  trail.load(location.hash);
});
