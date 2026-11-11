import { GRID, screenToWorld, zoomAt } from './model.js';

export const isTyping = target => !!target?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])');

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
    this.resizeObserver = new ResizeObserver(() => this.draw());
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
  set(value) { this.value = { ...value }; this.draw(); }
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
    if (action === 'pan') this.set({ ...this.value,
      x: this.value.x + dx / (GRID * this.value.zoom),
      y: this.value.y + dy / (GRID * this.value.zoom),
    });
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
      this.set({ ...this.value,
        x: this.value.x - (point.x - this.last.x) / (GRID * this.value.zoom),
        y: this.value.y - (point.y - this.last.y) / (GRID * this.value.zoom),
      });
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
