import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GRID, MIN_ZOOM, MAX_ZOOM, screenToWorld } from '../client/model.js';
import { Camera, wheelGesture, wrapInterval, wrapPan } from '../client/camera.js';

const wheel = (values, previous) => wheelGesture({ deltaMode: 0, deltaX: 0, deltaY: 120, timeStamp: 0, ctrlKey: false, ...values }, previous);

test('discrete mouse ticks zoom, even in a fast burst or line/page delta mode', () => {
  let previous;
  for (let i = 0; i < 20; i++) {
    previous = wheel({ timeStamp: i * 8, deltaY: i % 2 ? 120 : -120 }, previous);
    assert.equal(previous.action, 'zoom');
  }
  assert.equal(wheel({ deltaMode: 1, deltaY: 3 }).action, 'zoom');
  assert.equal(wheel({ deltaMode: 2, deltaY: -1 }).action, 'zoom');
});

test('trackpad deltas pan on both axes and stay panning through acceleration and momentum', () => {
  assert.equal(wheel({ deltaX: 8, deltaY: 0 }).action, 'pan');
  assert.equal(wheel({ deltaY: 6 }).action, 'pan');
  assert.equal(wheel({ deltaY: 71.5 }).action, 'pan');
  let previous;
  for (const [i, deltaY] of [4, 80, 160, 120, 50, 8, 1].entries()) {
    previous = wheel({ timeStamp: i * 16, deltaY }, previous);
    assert.equal(previous.action, 'pan');
  }
  assert.equal(wheel({ timeStamp: 400 }, previous).action, 'zoom');
});

test('rapid variable pixel deltas can identify a trackpad after a coarse first event', () => {
  const first = wheel({ deltaY: 60 });
  assert.equal(wheel({ deltaY: 79, timeStamp: 16 }, first).action, 'pan');
  assert.equal(wheel({ deltaY: 120, timeStamp: 16 }, first).action, 'zoom');
});

test('Ctrl/trackpad pinch zoom overrides an ordinary scrolling stream', () => {
  const pan = wheel({ deltaX: 5, deltaY: 12 });
  const pinch = wheel({ ctrlKey: true, deltaY: -2, timeStamp: 16 }, pan);
  assert.equal(pinch.action, 'zoom');
  assert.equal(wheel({ deltaY: 120, timeStamp: 32 }, pinch).action, 'zoom');
});

// Exercise the real pointer state machine with a viewport offset (the breadcrumb
// sits above it), rather than testing a separate mobile-only transform.
function touchCamera(initial = { x: 3, y: -2, zoom: 1.25 }) {
  const camera = Object.create(Camera.prototype), captured = new Set();
  Object.assign(camera, {
    value: { ...initial }, pointers: new Map(), draw() {},
    viewport: { clientWidth: 400, clientHeight: 800, getBoundingClientRect: () => ({ left: 10, top: 30 }),
      setPointerCapture: id => captured.add(id), hasPointerCapture: id => captured.has(id) },
  });
  const target = { closest: () => null, setPointerCapture() {} };
  const event = (id, x, y) => ({ pointerId: id, pointerType: 'touch', button: 0, clientX: x + 10, clientY: y + 30, target, preventDefault() {} });
  const send = (method, id, x = 0, y = 0, cancelled = false) => camera[method](event(id, x, y), cancelled);
  return { camera, send };
}
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);
const anchor = (camera, point) => screenToWorld(point, camera.value, camera.size);

test('touch pinch preserves the moving midpoint anchor and reverses without drift', () => {
  const { camera, send } = touchCamera(), initial = { ...camera.value };
  send('down', 1, 100, 300); send('down', 2, 220, 300);
  const world = anchor(camera, { x: 160, y: 300 });
  for (let i = 0; i < 100; i++) {
    send('move', 1, 80, 340); send('move', 2, 320, 340);
    near(camera.value.zoom, initial.zoom * 2);
    const after = anchor(camera, { x: 200, y: 340 }); near(after.x, world.x); near(after.y, world.y);
    send('move', 1, 100, 300); send('move', 2, 220, 300);
    for (const key of ['x', 'y', 'zoom']) near(camera.value[key], initial[key]);
  }
  send('move', 1, 124, 348); send('move', 2, 244, 348);
  near(camera.value.zoom, initial.zoom);
  near(camera.value.x, initial.x - 24 / (GRID * initial.zoom));
  near(camera.value.y, initial.y - 48 / (GRID * initial.zoom));
});

test('finger handoffs, third fingers, cancellation and a fresh touch never jump the camera', () => {
  const { camera, send } = touchCamera();
  send('down', 1, 100, 300); send('down', 2, 220, 300);
  send('move', 2, 280, 300);
  const beforeLift = { ...camera.value };
  send('up', 1); assert.deepEqual(camera.value, beforeLift);
  send('move', 2, 304, 348);
  near(camera.value.x, beforeLift.x - 24 / (GRID * beforeLift.zoom));
  near(camera.value.y, beforeLift.y - 48 / (GRID * beforeLift.zoom));
  const beforeJoin = { ...camera.value };
  send('down', 3, 120, 348); assert.deepEqual(camera.value, beforeJoin);
  send('down', 4, 200, 500); assert.deepEqual(camera.value, beforeJoin);
  send('up', 2, 0, 0, true); assert.deepEqual(camera.value, beforeJoin);
  send('move', 3, 144, 372); send('move', 4, 224, 524);
  near(camera.value.zoom, beforeJoin.zoom);
  near(camera.value.x, beforeJoin.x - 24 / (GRID * beforeJoin.zoom));
  send('up', 3); send('up', 4);
  assert.equal(camera.pinch, null); assert.equal(camera.pointers.size, 0);
  assert.ok(camera.suppressUntil > performance.now());
  const finished = { ...camera.value }; send('down', 5, 70, 70);
  assert.deepEqual(camera.value, finished); assert.equal(camera.moved, false); send('up', 5);
});

test('touch zoom clamps at existing limits without losing the midpoint anchor', () => {
  for (const [span, zoom] of [[100000, MAX_ZOOM], [0.001, MIN_ZOOM]]) {
    const { camera, send } = touchCamera();
    send('down', 1, 100, 300); send('down', 2, 220, 300);
    const world = anchor(camera, { x: 160, y: 300 });
    send('move', 1, 160 - span / 2, 300); send('move', 2, 160 + span / 2, 300);
    near(camera.value.zoom, zoom);
    const after = anchor(camera, { x: 160, y: 300 }); near(after.x, world.x); near(after.y, world.y);
  }
});

test('a second touch cancels an editor operation and selection once; remaining finger only pans', () => {
  const { camera, send } = touchCamera(); let cancelled = 0, restored = 0, moves = 0, ends = 0;
  camera.onTouchStart = () => () => restored++;
  camera.onObjectDown = () => ({ move: () => moves++, cancel: () => cancelled++, end: () => ends++ });
  send('down', 1, 100, 300); send('move', 1, 124, 300); assert.equal(moves, 1);
  send('down', 2, 220, 300); send('move', 2, 280, 300); send('up', 2);
  send('move', 1, 148, 324); send('up', 1);
  assert.equal(cancelled, 1); assert.equal(restored, 1); assert.equal(moves, 1); assert.equal(ends, 0);
});

const bounds = { minX: -14.5, minY: -8.75, maxX: 7.25, maxY: 13.5 };
const size = { width: 390, height: 814 };
const blank = (camera, b = bounds, viewport = size) => {
  const hx = viewport.width / (2 * GRID * camera.zoom), hy = viewport.height / (2 * GRID * camera.zoom);
  return camera.x - hx > b.maxX || camera.x + hx < b.minX || camera.y - hy > b.maxY || camera.y + hy < b.minY;
};

test('all four crossings preserve fractional overshoot, with blank exit and entry viewports at every zoom', () => {
  for (const zoom of [MIN_ZOOM, 0.5, 1, 2.75, MAX_ZOOM]) {
    const limits = wrapInterval(bounds, size, zoom);
    for (const axis of ['x', 'y']) for (const direction of [-1, 1]) {
      const [lo, hi] = limits[axis], step = 0.25 / zoom;
      const before = { x: 0, y: 0, zoom, [axis]: direction > 0 ? hi - step : lo + step };
      const next = { ...before, [axis]: before[axis] + direction * step * 2 };
      const result = wrapPan(before, next, bounds, size);
      assert.ok(blank(before)); assert.ok(blank(next)); assert.ok(blank(result));
      near(result[axis], direction > 0 ? lo + step : hi - step);
      near(result[axis === 'x' ? 'y' : 'x'], 0);
    }
  }
});

test('multiple periods and diagonal overshoot consume the complete pan delta in one finite result', () => {
  const before = { x: -3, y: 1, zoom: 1.7 }, limits = wrapInterval(bounds, size, before.zoom);
  const px = limits.x[1] - limits.x[0], py = limits.y[1] - limits.y[0];
  for (const n of [1, 17, 1000000]) {
    const result = wrapPan(before, { ...before, x: before.x + n * px + 0.125, y: before.y - n * py - 0.375 }, bounds, size);
    assert.ok(Math.abs(result.x - before.x - 0.125) < 1e-7);
    assert.ok(Math.abs(result.y - before.y + 0.375) < 1e-7);
    assert.ok(Object.values(result).every(Number.isFinite));
  }
  const [left, right] = limits.x, [top, bottom] = limits.y;
  const corner = { x: right - 0.1, y: top + 0.1, zoom: before.zoom };
  const crossed = wrapPan(corner, { ...corner, x: right + 0.1, y: top - 0.1 }, bounds, size);
  near(crossed.x, left + 0.1); near(crossed.y, bottom - 0.1);
  assert.ok(blank(corner)); assert.ok(blank(crossed));
});

test('rapid boundary reversals and many tiny steps neither oscillate nor accumulate drift', () => {
  const [lo, hi] = wrapInterval(bounds, size, 1).x;
  let camera = { x: hi - 0.125, y: 0, zoom: 1 };
  for (let i = 0; i < 10000; i++) {
    camera = wrapPan(camera, { ...camera, x: camera.x + 0.25 }, bounds, size); near(camera.x, lo + 0.125);
    camera = wrapPan(camera, { ...camera, x: camera.x - 0.25 }, bounds, size); near(camera.x, hi - 0.125);
  }
  const start = { ...camera }, period = hi - lo;
  for (let i = 0; i < 10000; i++) camera = wrapPan(camera, { ...camera, x: camera.x + period / 10000 }, bounds, size);
  assert.ok(Math.abs(camera.x - start.x) < 1e-8);
});

test('zoom and resize never normalize; subsequent travel outside new limits starts blank and respects direction', () => {
  const camera = { x: 1000, y: -1000, zoom: 1 };
  const zoomed = { ...camera, zoom: 2 };
  assert.deepEqual(wrapPan(camera, zoomed, bounds, size), zoomed);
  const limits = wrapInterval(bounds, size, zoomed.zoom);
  const inward = { ...zoomed, x: 999, y: -999 };
  assert.deepEqual(wrapPan(zoomed, inward, bounds, size), inward);
  const outward = wrapPan(zoomed, { ...zoomed, x: 1000.1, y: -1000.1 }, bounds, size);
  near(outward.x, limits.x[0] + 0.1); near(outward.y, limits.y[1] - 0.1); assert.ok(blank(outward));
  assert.deepEqual(wrapPan(zoomed, zoomed, bounds, { width: 1800, height: 300 }), zoomed);
  assert.ok(wrapInterval(bounds, { width: 1800, height: 300 }, 2).x[1] > limits.x[1]);
});

test('empty, degenerate and invalid bounds keep ordinary panning; nonfinite input cannot corrupt a camera', () => {
  const before = { x: 1, y: 2, zoom: 1 }, next = { x: 999, y: -999, zoom: 1 };
  for (const b of [null, {}, { ...bounds, maxX: NaN }, { ...bounds, maxX: bounds.minX }, { ...bounds, minY: Infinity }])
    assert.deepEqual(wrapPan(before, next, b, size), next);
  assert.deepEqual(wrapPan(before, next, bounds, { width: 0, height: 0 }), next);
  assert.deepEqual(wrapPan(before, { ...next, x: Infinity }, bounds, size), before);
  const huge = wrapPan(before, { ...next, x: 1e200, y: -1e200 }, bounds, size);
  assert.ok(Object.values(huge).every(Number.isFinite));
});

test('a tiny object, a large image and widely separated negative objects all leave full blank viewports', () => {
  for (const box of [
    { minX: -0.25, maxX: 0.25, minY: -0.1, maxY: 0.1 },
    { minX: -500, maxX: 500, minY: -700, maxY: 700 },
    { minX: -100000, maxX: 80000, minY: -50000, maxY: 90000 },
  ]) for (const zoom of [MIN_ZOOM, MAX_ZOOM]) {
    const interval = wrapInterval(box, size, zoom);
    const before = { x: interval.x[1] - 0.01, y: interval.y[0] + 0.01, zoom };
    const next = wrapPan(before, { ...before, x: before.x + 0.02, y: before.y - 0.02 }, box, size);
    assert.ok(blank(before, box)); assert.ok(blank(next, box));
    assert.ok(Object.values(next).every(Number.isFinite));
  }
});

test('wheel, drag and single-finger movement share wrapping while pinch and direct camera sets do not', () => {
  const { camera, send } = touchCamera({ x: 0, y: 0, zoom: 1 });
  camera.panBounds = () => bounds;
  camera.touchDevice = { matches: false }; camera.wheelMode = 'trackpad';
  const [lo, hi] = wrapInterval(bounds, camera.size, 1).x;
  camera.set({ x: hi - 0.1, y: 0, zoom: 1 });
  camera.wheel({ target: {}, deltaX: 4.8, deltaY: 0, deltaMode: 0, timeStamp: 0, preventDefault() {} });
  near(camera.value.x, lo + 0.1);
  camera.set({ x: hi - 0.1, y: 0, zoom: 1 }); send('down', 1, 100, 300); send('move', 1, 95.2, 300);
  near(camera.value.x, lo + 0.1); send('up', 1);
  camera.set({ x: hi + 10, y: 0, zoom: 1 });
  send('down', 1, 100, 300); send('down', 2, 200, 300);
  send('move', 1, 90, 300); send('move', 2, 210, 300);
  assert.ok(camera.value.x > bounds.maxX); near(camera.value.zoom, 1.2);
  send('up', 1); send('up', 2);
  camera.panBounds = () => null; camera.set({ x: hi, y: 0, zoom: 1 }); camera.pan(1000, -1000);
  near(camera.value.x, hi + 1000); near(camera.value.y, -1000);
});
