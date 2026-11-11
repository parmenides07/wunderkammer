import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wheelGesture } from '../client/camera.js';

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
