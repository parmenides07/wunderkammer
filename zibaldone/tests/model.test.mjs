import { test } from 'node:test';
import assert from 'node:assert/strict';
import { screenToWorld, zoomAt, resizeBox, snap, validatePage, isMaximizable, isInteractive, canInvert, elementBounds } from '../client/model.js';

test('pointer-anchored zoom has no accumulating world-coordinate drift', () => {
  const size = { width: 391, height: 843 };
  const point = { x: 83.25, y: 691.75 };
  let camera = { x: -1032.5, y: 2054.3, zoom: 1.2 };
  const anchor = screenToWorld(point, camera, size);
  for (let i = 0; i < 1000; i++) {
    camera = zoomAt(camera, point, size, i % 2 ? 0.08 : 8);
    const actual = screenToWorld(point, camera, size);
    assert.ok(Math.abs(actual.x - anchor.x) < 1e-9);
    assert.ok(Math.abs(actual.y - anchor.y) < 1e-9);
  }
});

test('legacy assets keep focus, default to no inversion, and remain unmodified by validation', () => {
  const e = { id: 'legacy', type: 'text', x: 0, y: 0, width: 10, height: 4, text: 'Legacy', font: 'mono', fontSize: 16 };
  const page = { slug: 'home', camera: { x: 0, y: 0, zoom: 1 }, elements: [e] };
  const original = JSON.stringify(page);
  validatePage(page);
  assert.equal(JSON.stringify(page), original);
  assert.equal(e.zIndex ?? 0, 0);
  assert.equal(isMaximizable(e), true);
  assert.equal(isInteractive(e), true);
  assert.equal(canInvert(e), false);
  assert.equal(isInteractive({ ...e, maximizable: false }), false);
  assert.equal(canInvert({ ...e, maximizable: false, invertOnHover: true }), false);
  const linked = { ...e, maximizable: false, href: '/zibaldone/', invertOnHover: true };
  assert.equal(isMaximizable(linked), false);
  assert.equal(isInteractive(linked), true);
  assert.equal(canInvert(linked), true);
  assert.equal(canInvert({ ...linked, type: 'image' }), false);
});

test('line schema supports reversed, vertical, horizontal, and coincident endpoints', () => {
  const line = { id: 'line', type: 'line', x1: 4, y1: 3, x2: -2, y2: -4, zIndex: -3, strokeStyle: 'dotted', strokeWidth: 0.5, arrowhead: true };
  const page = { slug: 'home', camera: { x: 0, y: 0, zoom: 1 }, elements: [line] };
  assert.equal(validatePage(page), page);
  assert.deepEqual(elementBounds(line), { x: -2, y: -4, width: 6, height: 7 });
  for (const endpoint of [{ x2: 4, y2: -4 }, { x2: -2, y2: 3 }, { x2: 4, y2: 3 }])
    assert.doesNotThrow(() => validatePage({ ...page, elements: [{ ...line, ...endpoint }] }));
  assert.equal(isMaximizable(line), false);
  assert.equal(isInteractive(line), false);
  for (const invalid of [{ zIndex: 0.5 }, { zIndex: Infinity }, { x1: NaN }, { x2: '2' }, { strokeStyle: 'curved' }, { strokeWidth: 0 }, { arrowhead: 'yes' }, { href: '/zibaldone/' }])
    assert.throws(() => validatePage({ ...page, elements: [{ ...line, ...invalid }] }));
});

test('new text/image options reject invalid types rather than silently changing saved behavior', () => {
  const e = { id: 'a', type: 'text', x: 0, y: 0, width: 1, height: 1, text: '', font: 'mono', fontSize: 16 };
  for (const invalid of [{ maximizable: 'false' }, { invertOnHover: 1 }, { zIndex: 1.1 }])
    assert.throws(() => validatePage({ slug: 'home', camera: { x: 0, y: 0, zoom: 1 }, elements: [{ ...e, ...invalid }] }));
});

test('grid positioning and resizing work at negative coordinates without coupling font size', () => {
  assert.equal(snap(-13.7), -14);
  assert.equal(snap(-13.7, false), -13.7);
  const box = { width: 12, height: 7, fontSize: 16 };
  assert.deepEqual(resizeBox(box, 2.7, -1.2, true), { width: 15, height: 6 });
  assert.equal(box.fontSize, 16);
  assert.deepEqual(resizeBox(box, -100, -100, true), { width: 1, height: 1 });
  const image = resizeBox({ width: 12, height: 8 }, 2.7, 0, true, true);
  assert.equal(image.width, 15);
  assert.equal(image.width / image.height, 1.5);
});

test('schema rejects unsafe links, paths, duplicate IDs, and invalid geometry', () => {
  const page = { slug: 'home', camera: { x: -1e8, y: 1e8, zoom: 1 }, elements: [
    { id: 'a', type: 'text', x: -12, y: 3, width: 12, height: 7, text: 'Two\nlines', font: 'mono', fontSize: 16 },
  ] };
  assert.equal(validatePage(page), page);
  for (const href of ['javascript:alert(1)', '//evil.example', 'data:text/html,evil'])
    assert.throws(() => validatePage({ ...page, elements: [{ ...page.elements[0], href }] }));
  assert.throws(() => validatePage({ ...page, elements: [page.elements[0], page.elements[0]] }));
  assert.throws(() => validatePage({ ...page, elements: [{ ...page.elements[0], width: 0 }] }));
  assert.throws(() => validatePage({ ...page, slug: '../outside' }));
  assert.throws(() => validatePage({ ...page, elements: [{ ...page.elements[0], type: 'image', src: '/zibaldone/assets/../secret.png', alt: '' }] }));
});
