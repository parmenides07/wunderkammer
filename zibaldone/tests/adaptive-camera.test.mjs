import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adaptivePan, wrapInterval, Camera } from '../client/camera.js';
import { GRID, MIN_ZOOM, MAX_ZOOM } from '../client/model.js';

const bounds = { minX: -14, minY: -9, maxX: 8, maxY: 17 };
const size = { width: 390, height: 814 };
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
const pan = (current, dx, dy, viewport = size, box = bounds) => adaptivePan(current.camera,
  { ...current.camera, x: current.camera.x + dx, y: current.camera.y + dy }, box, viewport, current.state);
const outside = (camera, limits) => camera.x < limits.x[0] || camera.x > limits.x[1] || camera.y < limits.y[0] || camera.y > limits.y[1];
const distant = (zoom = 1) => ({ camera: { x: 10000, y: -10000, zoom }, state: null });

test('adaptive approach waits for a blank frame, then uses the next movement at any continuous angle', () => {
  const limits = wrapInterval(bounds, size, 1);
  const before = { camera: { x: limits.x[1] - 1, y: 4, zoom: 1 } };
  const leftView = pan(before, 2, 0);
  assert.deepEqual(leftView.camera, { ...before.camera, x: before.camera.x + 2 });
  assert.equal(leftView.state, null);
  for (let degrees = 0; degrees < 360; degrees += 1.7) {
    const radians = degrees * Math.PI / 180, dx = Math.cos(radians), dy = Math.sin(radians);
    const result = pan(leftView, dx * 0.25 / GRID, dy * 0.25 / GRID);
    assert.ok(result.state); assert.ok(outside(result.camera, wrapInterval(bounds, size, 1, 0)));
    // The composition is directly ahead on the incoming ray, not one of eight slots.
    const cx = (bounds.minX + bounds.maxX) / 2, cy = (bounds.minY + bounds.maxY) / 2;
    near((cx - result.camera.x) * dy - (cy - result.camera.y) * dx, 0);
    assert.ok((cx - result.camera.x) * dx + (cy - result.camera.y) * dy > 0);
  }
});

test('blank direction changes preserve remaining approach distance, including sudden reversals', () => {
  let current = pan(distant(), 0.5 / GRID, 0);
  near(current.state.remaining * GRID, 1.5);
  const core = wrapInterval(bounds, size, 1, 0);
  for (const [dx, dy] of [[0, 1], [-1, 0], [0.6, -0.8]]) {
    const remaining = current.state.remaining;
    current = pan(current, dx * 0.5 / GRID, dy * 0.5 / GRID);
    if (current.state) {
      near(current.state.remaining, remaining - 0.5 / GRID);
      near(current.state.direction.x, dx); near(current.state.direction.y, dy);
      assert.ok(outside(current.camera, core));
    }
  }
  assert.equal(current.state, null, 'turning must not repeatedly restart the clearance');
  const locked = current.camera;
  current = pan(current, 0.001, 0.002);
  near(current.camera.x, locked.x + 0.001); near(current.camera.y, locked.y + 0.002);
});

test('first possible content visibility locks placement, including a reversed pan', () => {
  const current = pan(distant(), 8 / GRID, 0);
  assert.equal(current.state, null);
  assert.ok(!outside(current.camera, wrapInterval(bounds, size, 1, 0)));
  for (const [dx, dy] of [[1 / GRID, 0], [-1 / GRID, 0], [0, 1 / GRID], [0, -1 / GRID]]) {
    const next = pan(current, dx, dy);
    near(next.camera.x, current.camera.x + dx); near(next.camera.y, current.camera.y + dy);
    assert.equal(next.state, null);
  }
});

test('tiny noisy input is sampled by distance without losing movement or oscillating indefinitely', () => {
  let current = pan(distant(), 0.01 / GRID, 0), previous = current.state.remaining;
  for (let i = 0; i < 150; i++) {
    current = pan(current, 0, (i % 2 ? -1 : 1) * 0.01 / GRID);
    assert.ok(Object.values(current.camera).every(Number.isFinite));
    assert.ok(current.state); assert.ok(current.state.remaining < previous);
    near(current.state.direction.x, 1); near(current.state.direction.y, 0);
    previous = current.state.remaining;
  }
  current = pan(current, 0.5 / GRID, 0);
  assert.equal(current.state, null);
});

test('clearance stays in screen pixels at extreme zooms and zero/invalid input cannot move a camera', () => {
  for (const zoom of [MIN_ZOOM, 0.5, 1, MAX_ZOOM]) {
    const current = pan(distant(zoom), 0.5 / (GRID * zoom), 0);
    const limits = wrapInterval(bounds, size, zoom);
    near(current.camera.x, limits.x[0] + 0.5 / (GRID * zoom));
    near(current.state.remaining * GRID * zoom, 1.5);
    assert.deepEqual(pan(current, 0, 0), current);
    const huge = pan(current, 1e100, -1e100);
    assert.ok(Object.values(huge.camera).every(Number.isFinite));
  }
  const before = distant();
  assert.deepEqual(pan(before, Infinity, 0), before);
  for (const invalid of [null, {}, { ...bounds, maxX: bounds.minX }]) {
    const result = pan(before, 1, -1, size, invalid);
    assert.deepEqual(result.camera, { x: 10001, y: -10001, zoom: 1 }); assert.equal(result.state, null);
  }
});

test('zoom, resize, layout changes and direct sets discard old approaches; an editor never acquires one', () => {
  const active = pan(distant(), 0.5 / GRID, 0);
  const zoomed = { ...active.camera, zoom: 2 };
  assert.deepEqual(adaptivePan(active.camera, zoomed, bounds, size, active.state), { camera: zoomed, state: null });
  const resized = pan(active, 0, 0, { width: 1800, height: 300 });
  assert.deepEqual(resized, { camera: active.camera, state: null });
  const relaid = pan(active, 0, 0, size, { ...bounds });
  assert.equal(relaid.state, null); assert.deepEqual(relaid.camera, active.camera);
  const camera = Object.create(Camera.prototype);
  Object.assign(camera, { value: active.camera, wrapState: active.state, viewport: { clientWidth: size.width, clientHeight: size.height }, draw() {} });
  camera.set(zoomed); assert.equal(camera.wrapState, null); assert.deepEqual(camera.value, zoomed);
  camera.pan(10000, -10000);
  assert.deepEqual(camera.value, { ...zoomed, x: zoomed.x + 10000, y: zoomed.y - 10000 });
  assert.equal(camera.wrapState, null);
});
