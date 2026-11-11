import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GRID, MIN_ZOOM, MAX_ZOOM, screenToWorld } from '../client/model.js';
import { Camera, wheelGesture } from '../client/camera.js';

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
