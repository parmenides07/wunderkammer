import { GRID, screenToWorld, zoomAt } from './model.js';

export const isTyping = target => !!target?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])');

// Internal experiment switch: 'adaptive', 'reflection', or 'translation'.
// The previous algorithms remain below; none transforms authored content.
export const WRAP_MODE = 'adaptive';
export const WRAP_CLEARANCE_PX = 2;
const DIRECTION_SAMPLE_PX = 0.5;

// World-space camera-center limits, padded in screen pixels at the current zoom.
export function wrapInterval(bounds, size, zoom, clearance = WRAP_CLEARANCE_PX) {
  if (!bounds || ![bounds.minX, bounds.minY, bounds.maxX, bounds.maxY, size.width, size.height, zoom].every(Number.isFinite) ||
      bounds.maxX <= bounds.minX || bounds.maxY <= bounds.minY || size.width <= 0 || size.height <= 0 || zoom <= 0) return null;
  const scale = GRID * zoom;
  const x = (size.width / 2 + clearance) / scale, y = (size.height / 2 + clearance) / scale;
  const limits = { x: [bounds.minX - x, bounds.maxX + x], y: [bounds.minY - y, bounds.maxY + y] };
  return Object.values(limits).every(([lo, hi]) => Number.isFinite(hi - lo) && hi > lo) ? limits : null;
}

export function translatePan(before, next, bounds, size) {
  if (![next.x, next.y, next.zoom].every(Number.isFinite)) return { ...before };
  const limits = before.zoom === next.zoom && wrapInterval(bounds, size, next.zoom);
  if (!limits) return next;
  const result = { ...next };
  for (const axis of ['x', 'y']) {
    const [lo, hi] = limits[axis], period = hi - lo, delta = next[axis] - before[axis];
    if (!Number.isFinite(delta)) continue;
    // Zoom, resizing or a saved entry view may start outside the interval.
    // Inward travel stays natural; outward travel starts a new blank-to-blank
    // crossing here, without treating the earlier zoom displacement as pan.
    if (delta > 0 && next[axis] > hi) result[axis] = lo + ((Math.min(before[axis], hi) + delta - hi) % period);
    if (delta < 0 && next[axis] < lo) result[axis] = hi - ((lo - Math.max(before[axis], lo) - delta) % period);
  }
  // Each period skips only a blank-to-blank boundary. The remainder is ordinary
  // pan travel, even for multi-period input; never render intermediate positions.
  return result;
}

export function reflectPan(before, next, bounds, size) {
  if (![next.x, next.y, next.zoom].every(Number.isFinite)) return { ...before };
  const limits = before.zoom === next.zoom && wrapInterval(bounds, size, next.zoom);
  if (!limits) return next;
  const dx = next.x - before.x, dy = next.y - before.y, distance = Math.hypot(dx, dy);
  if (!distance || !Number.isFinite(distance)) return next;
  const direction = { x: dx / distance, y: dy / distance };
  // Intersect the whole movement line with the camera-center rectangle. A
  // corner is one exit, not separate X/Y reflections. A tangent that never
  // enters this rectangle simply keeps panning through empty space.
  let enter = -Infinity, exit = Infinity;
  for (const axis of ['x', 'y']) {
    const [lo, hi] = limits[axis], v = direction[axis];
    if (!v) { if (before[axis] <= lo || before[axis] >= hi) return next; continue; }
    const a = (lo - before[axis]) / v, b = (hi - before[axis]) / v;
    enter = Math.max(enter, Math.min(a, b)); exit = Math.min(exit, Math.max(a, b));
  }
  const span = exit - enter;
  if (exit >= distance || !(span > 0) || !Number.isFinite(span)) return next;
  // Reflect the EXIT point, then spend the unconsumed motion in its original
  // direction. After zoom/resizing outside the interval, only this pan counts.
  const remainder = distance - Math.max(0, exit);
  // The reflected chord has the same length. Two traversals return to the
  // original chord, so modulo handles huge gestures without a reflection loop.
  const phase = remainder % (2 * span), opposite = phase <= span;
  const travel = opposite ? phase : phase - span;
  const result = { ...next };
  for (const axis of ['x', 'y']) {
    const [lo, hi] = limits[axis], clamp = value => Math.max(lo, Math.min(hi, value));
    const edge = clamp(before[axis] + direction[axis] * (opposite ? exit : enter));
    result[axis] = clamp((opposite ? lo + (hi - edge) : edge) + direction[axis] * travel);
  }
  return Object.values(result).every(Number.isFinite) ? result : next;
}

export function wrapPan(before, next, bounds, size) {
  return (WRAP_MODE === 'reflection' ? reflectPan : translatePan)(before, next, bounds, size);
}

const outside = (point, limits) => ['x', 'y'].some(axis => point[axis] < limits[axis][0] || point[axis] > limits[axis][1]);

// State exists only during the short, blank approach. Entry is the intersection
// of a continuous direction ray with the viewport-expanded content rectangle.
// Keeping distance-to-entry (rather than a fixed camera offset) lets direction
// change without restarting the gap or moving any visible content.
export function adaptivePan(before, next, bounds, size, state = null) {
  const unchanged = { camera: next, state: null };
  if (![next.x, next.y, next.zoom].every(Number.isFinite)) return { camera: before, state: null };
  const limits = before.zoom === next.zoom && wrapInterval(bounds, size, next.zoom);
  if (!limits) return unchanged;
  const core = wrapInterval(bounds, size, next.zoom, 0);
  if (state && (state.bounds !== bounds || state.width !== size.width || state.height !== size.height || state.zoom !== next.zoom)) state = null;
  const dx = next.x - before.x, dy = next.y - before.y, distance = Math.hypot(dx, dy);
  if (!distance || !Number.isFinite(distance)) return { ...unchanged, state };
  // First render an ordinary pan into blank space. Only a subsequent movement
  // may choose an approach. Lock before even potentially visible pixels enter.
  if (!outside(before, core) || (!state && !outside(before, limits))) return unchanged;
  let direction = { x: dx / distance, y: dy / distance };
  let sampleX = dx, sampleY = dy;
  if (state) {
    sampleX += state.sampleX; sampleY += state.sampleY;
    const sampleLength = Math.hypot(sampleX, sampleY);
    if (sampleLength * GRID * next.zoom < DIRECTION_SAMPLE_PX - 1e-7) direction = state.direction;
    else { direction = { x: sampleX / sampleLength, y: sampleY / sampleLength }; sampleX = sampleY = 0; }
  } else sampleX = sampleY = 0;
  const radius = rectangle => Math.min(...['x', 'y'].map(axis =>
    direction[axis] ? (rectangle[axis][1] - rectangle[axis][0]) / (2 * Math.abs(direction[axis])) : Infinity));
  const edge = radius(core);
  const remaining = (state?.remaining ?? radius(limits) - edge) - distance;
  const camera = { ...next };
  for (const axis of ['x', 'y']) {
    const [lo, hi] = core[axis], center = lo + (hi - lo) / 2;
    camera[axis] = center - direction[axis] * (edge + remaining);
  }
  if (![camera.x, camera.y].every(Number.isFinite)) return unchanged;
  return { camera, state: remaining * GRID * next.zoom > 1e-7 ? {
    bounds, width: size.width, height: size.height, zoom: next.zoom,
    direction, remaining, sampleX, sampleY,
  } : null };
}

// WheelEvent has no reliable device identifier. Fine/diagonal motion and a
// continuous, varying pixel stream suggest a trackpad; coarse ticks suggest a
// mouse. Keep an established pan through acceleration and its momentum tail.
export function wheelGesture(event, previous) {
  const { deltaX, deltaY, deltaMode, timeStamp, ctrlKey } = event;
  const gap = timeStamp - (previous?.timeStamp ?? -Infinity);
  const continuing = !previous?.ctrlKey && gap >= 0 && gap < 180;
  const amount = Math.abs(deltaY);
  const priorAmount = Math.abs(previous?.deltaY || 0);
  const fine = deltaX !== 0 || amount < 40 || !Number.isInteger(deltaY);
  const varying = continuing && gap < 40 && priorAmount > 0 && amount > 0 &&
    amount % priorAmount !== 0 && priorAmount % amount !== 0;
  const pan = !ctrlKey && deltaMode === 0 &&
    (fine || varying || (continuing && previous.action === 'pan'));
  return { action: pan ? 'pan' : 'zoom', timeStamp, deltaY, ctrlKey };
}

export class Camera {
  constructor(viewport, world, initial) {
    this.viewport = viewport;
    this.world = world;
    this.value = { ...initial };
    this.pointers = new Map();
    this.space = false;
    this.suppressUntil = 0;
    this.wheelMode = 'auto';
    try {
      const mode = localStorage.getItem('space-wheel-mode');
      if (['auto', 'mouse', 'trackpad'].includes(mode)) this.wheelMode = mode;
    } catch { /* Input preferences are optional when storage is unavailable. */ }
    // Do not mistake a touchscreen laptop with a fine pointer for a phone.
    this.touchDevice = window.matchMedia('(pointer: coarse) and (hover: none)');
    this.resizeObserver = new ResizeObserver(() => { this.wrapState = null; this.draw(); });
    this.resizeObserver.observe(viewport);
    viewport.addEventListener('wheel', e => this.wheel(e), { passive: false });
    viewport.addEventListener('pointerdown', e => this.down(e));
    viewport.addEventListener('pointermove', e => this.move(e));
    viewport.addEventListener('pointerup', e => this.up(e));
    viewport.addEventListener('pointercancel', e => this.up(e, true));
    viewport.addEventListener('lostpointercapture', e => {
      // Pinching transfers capture off editor handles before they are removed.
      if (!viewport.hasPointerCapture(e.pointerId)) this.up(e, true);
    });
    viewport.addEventListener('click', e => {
      if (performance.now() < this.suppressUntil) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }, true);
    window.addEventListener('keydown', e => {
      if (e.code === 'Space' && !isTyping(e.target) && !e.target.closest('button, summary, #breadcrumbs') && !document.querySelector('dialog[open]')) {
        e.preventDefault();
        this.space = true;
        viewport.classList.add('pan-ready');
      }
    });
    window.addEventListener('keyup', e => {
      if (e.code === 'Space') this.releaseSpace();
    });
    window.addEventListener('blur', () => {
      this.releaseSpace();
      this.gesture?.cancel?.();
      this.gesture = null;
      this.pointers.clear();
      this.multiTouch = false;
      this.pinch = this.cancelTouch = null;
    });
    this.draw();
  }

  get size() { return { width: this.viewport.clientWidth, height: this.viewport.clientHeight }; }
  point(e) {
    const rect = this.viewport.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  toWorld(point) { return screenToWorld(point, this.value, this.size); }
  releaseSpace() { this.space = false; this.viewport.classList.remove('pan-ready'); }
  set(value, wrapState = null) { this.wrapState = wrapState; this.value = { ...value }; this.draw(); }
  pan(dx, dy) {
    const next = { ...this.value, x: this.value.x + dx, y: this.value.y + dy }, bounds = this.panBounds?.();
    if (WRAP_MODE === 'adaptive') {
      const result = adaptivePan(this.value, next, bounds, this.size, this.wrapState);
      this.set(result.camera, result.state);
    } else this.set(wrapPan(this.value, next, bounds, this.size));
  }
  draw() {
    const { x, y, zoom } = this.value;
    const tx = this.size.width / 2 - x * GRID * zoom;
    const ty = this.size.height / 2 - y * GRID * zoom;
    this.world.style.transform = `translate(${tx}px, ${ty}px) scale(${zoom})`;
    this.viewport.style.setProperty('--grid-size', `${GRID * zoom}px`);
    this.viewport.style.setProperty('--grid-x', `${tx}px`);
    this.viewport.style.setProperty('--grid-y', `${ty}px`);
    this.world.style.setProperty('--inverse-zoom', 1 / zoom);
    this.onChange?.(this.value);
  }
  wheel(e) {
    if (isTyping(e.target) || this.pointers.size || (!e.deltaX && !e.deltaY)) return;
    // Keep browser accessibility zoom available via Ctrl+wheel on mobile;
    // touch pinches use pointer positions, while desktop wheel handling is unchanged.
    if (this.touchDevice.matches && e.ctrlKey) return;
    this.wheelStream = wheelGesture(e, this.wheelStream);
    const action = this.touchDevice.matches ? 'pan' : e.ctrlKey ? 'zoom' :
      this.wheelMode === 'trackpad' ? 'pan' : this.wheelMode === 'mouse' ? 'zoom' : this.wheelStream.action;
    e.preventDefault();
    const dx = e.deltaX * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? this.size.width : 1);
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? this.size.height : 1);
    if (action === 'pan') this.pan(dx / (GRID * this.value.zoom), dy / (GRID * this.value.zoom));
    else this.set(zoomAt(this.value, this.point(e), this.size, this.value.zoom * Math.exp(-dy * 0.0015)));
  }
  setWheelMode(mode) {
    if (!['auto', 'mouse', 'trackpad'].includes(mode)) return;
    this.wheelMode = mode;
    this.wheelStream = null;
    try { localStorage.setItem('space-wheel-mode', mode); } catch { /* Session-only fallback. */ }
  }
  down(e) {
    if (e.button !== 0 && e.button !== 1) return;
    if (!this.pointers.size) this.suppressUntil = 0;
    if (isTyping(e.target) || e.target.closest('button:not(.resize-handle)')) return;
    const point = this.point(e);
    this.pointers.set(e.pointerId, point);
    // Capture on the original target so an ordinary link click remains a real click.
    e.target.setPointerCapture(e.pointerId);
    if (this.pointers.size >= 2) {
      for (const id of this.pointers.keys()) this.viewport.setPointerCapture(id);
      this.gesture?.cancel?.();
      this.cancelTouch?.(); this.cancelTouch = null;
      this.gesture = null;
      this.multiTouch = true;
      this.moved = true;
      if (this.touch && e.pointerType === 'touch') this.startPinch();
      return;
    }
    this.touch = e.pointerType === 'touch';
    this.cancelTouch = this.touch ? this.onTouchStart?.() : null;
    this.start = this.last = point;
    this.moved = false;
    const pan = this.space || e.button === 1;
    this.forcedPan = pan;
    this.gesture = !pan ? this.onObjectDown?.(e, point) : null;
    this.panning = pan || (!this.gesture && e.pointerType === 'touch');
    if (pan) e.preventDefault();
  }
  touchPair() {
    const [a, b] = this.pointers.values();
    return { midpoint: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, distance: Math.hypot(b.x - a.x, b.y - a.y) };
  }
  startPinch() { this.pinch = { ...this.touchPair(), camera: { ...this.value } }; }
  move(e) {
    if (!this.pointers.has(e.pointerId)) return;
    const point = this.point(e);
    this.pointers.set(e.pointerId, point);
    if (this.multiTouch) {
      if (this.pinch) {
        const { midpoint, distance } = this.touchPair(), start = this.pinch;
        // Zoom at the original midpoint, then translate that anchor with the
        // fingers. Deriving from the gesture start avoids accumulating drift.
        const next = zoomAt(start.camera, start.midpoint, this.size,
          start.camera.zoom * (start.distance ? distance / start.distance : 1));
        next.x -= (midpoint.x - start.midpoint.x) / (GRID * next.zoom);
        next.y -= (midpoint.y - start.midpoint.y) / (GRID * next.zoom);
        this.set(next);
        if (!start.distance) this.startPinch();
      }
      return;
    }
    if (Math.hypot(point.x - this.start.x, point.y - this.start.y) > 4) this.moved = true;
    if (this.moved && this.gesture) this.gesture.move(point, e);
    else if (this.moved && this.panning) {
      this.pan(-(point.x - this.last.x) / (GRID * this.value.zoom), -(point.y - this.last.y) / (GRID * this.value.zoom));
    }
    if (this.moved) this.last = point;
  }
  up(e, cancelled = false) {
    if (!this.pointers.has(e.pointerId)) return;
    this.pointers.delete(e.pointerId);
    if (this.moved || this.forcedPan || this.gesture) this.suppressUntil = performance.now() + 350;
    if (this.gesture) {
      if (cancelled) this.gesture.cancel?.();
      else this.gesture.end?.(this.moved, e);
    }
    this.gesture = null;
    if (this.multiTouch && this.touch) {
      if (this.pointers.size >= 2) this.startPinch();
      else {
        this.pinch = null;
        this.multiTouch = false;
        this.panning = true;
        this.start = this.last = this.pointers.values().next().value;
      }
    }
    if (!this.pointers.size) { this.multiTouch = false; this.pinch = this.cancelTouch = null; }
  }
}
