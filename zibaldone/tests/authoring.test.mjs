import { test } from 'node:test';
import assert from 'node:assert/strict';
import { History } from '../client/history.js';
import { encodeClipboard, decodeClipboard, cloneElements } from '../client/clipboard.js';
import { validatePage, linePoints, setLinePoints, elementBounds, translateElement, routeSegment, nearestSegment, intersectsRect, spaceURL, pageURL, normalizeBasePath } from '../client/model.js';
const text = { id: 'text', type: 'text', x: -3, y: 4, width: 5, height: 7, text: 'Two\nlines', font: 'baskerville', fontSize: 20 };
const line = { id: 'line', type: 'line', points: [[-8, 4], [2, 4], [2, -6], [8, -6]], strokeStyle: 'dotted', strokeWidth: 2, arrowhead: true, zIndex: -2 };
const page = elements => ({ slug: 'home', camera: { x: -2, y: 3, zoom: 1.5 }, elements });

test('polyline validation, legacy endpoints, bounds, routing, insertion and translation', () => {
  const old = { id: 'old', type: 'line', x1: 5, y1: -6, x2: 0, y2: 3 };
  const original = JSON.stringify(old);
  validatePage(page([old, line])); assert.equal(JSON.stringify(old), original);
  assert.deepEqual(linePoints(old), [[5, -6], [0, 3]]);
  assert.deepEqual(elementBounds(line), { x: -8, y: -6, width: 16, height: 10 });
  assert.deepEqual(routeSegment([0, 0], [3, 4]), [[0, 0], [3, 0], [3, 4]]);
  assert.deepEqual(routeSegment([0, 0], [3, 4], 'orthogonal', false), [[0, 0], [0, 4], [3, 4]]);
  assert.deepEqual(routeSegment([0, 0], [3, 4], 'direct'), [[0, 0], [3, 4]]);
  assert.deepEqual(routeSegment([0, 0], [0, 0]), [[0, 0]]);
  const hit = nearestSegment(line.points, [1.9, -1]);
  assert.equal(hit.index, 1); assert.deepEqual(hit.point, [2, -1]);
  const moved = translateElement(structuredClone(line), 0.5, -3);
  assert.deepEqual(moved.points, line.points.map(([x, y]) => [x + 0.5, y - 3]));
  setLinePoints(old, [[1, 2], [3, 4], [5, 6]]);
  assert.equal(old.x1, undefined); assert.deepEqual(linePoints(old), [[1, 2], [3, 4], [5, 6]]);
  for (const points of [[], [[0, 1]], [[0, 1], [2, Infinity]], [[0, 1], ['2', 3]], [[0, 1], [2, 3, 4]], Array(1001).fill([0, 0])])
    assert.throws(() => validatePage(page([{ ...line, points }])));
  assert.equal(intersectsRect(line, { x: -5, y: -2, width: 1, height: 1 }), false, 'empty line bounding box is not a hit');
  assert.equal(intersectsRect(line, { x: 1, y: -2, width: 2, height: 1 }), true);
  assert.equal(intersectsRect(text, { x: -4, y: 5, width: 2, height: 2 }), true);
});

test('typography, shadow and lock defaults preserve existing JSON; explicit values validate', () => {
  const p = page([text]), original = JSON.stringify(p);
  validatePage(p); assert.equal(JSON.stringify(p), original);
  assert.equal(text.lineHeight ?? 1.4, 1.4); assert.equal(text.letterSpacing ?? 0, 0);
  assert.equal(text.shadow ?? false, false); assert.equal(text.locked ?? false, false);
  for (const font of ['mono', 'baskerville']) validatePage(page([{ ...text, font, lineHeight: 1.25, letterSpacing: -0.02, shadow: true, locked: true }]));
  for (const invalid of [{ lineHeight: 0 }, { lineHeight: 5 }, { lineHeight: '1.2' }, { letterSpacing: -0.11 }, { letterSpacing: Infinity }, { shadow: 1 }, { locked: 'false' }])
    assert.throws(() => validatePage(page([{ ...text, ...invalid }])));
});

test('history groups completed drags, tracks saved snapshots, bounds memory, and invalidates redo', () => {
  const p = page([structuredClone(text)]), history = new History(p, 100);
  for (let i = 0; i < 50; i++) p.elements[0].x += 0.1;
  history.commit(p);
  assert.equal(history.states.length, 2); assert.equal(history.isDirty(p), true);
  const moved = structuredClone(p);
  const original = history.undo(); assert.equal(original.elements[0].x, text.x); assert.equal(history.isDirty(original), false);
  assert.deepEqual(history.redo(), moved);
  history.markSaved(moved); assert.equal(history.isDirty(moved), false);
  const prior = history.undo(); assert.equal(history.isDirty(prior), true);
  prior.elements[0].text = 'new branch'; history.commit(prior); assert.equal(history.redo(), null);
  const sent = JSON.stringify(prior);
  prior.elements[0].fontSize = 25; history.commit(prior); history.markSaved(sent);
  assert.equal(history.isDirty(prior), true, 'saving an older in-flight snapshot must not mark newer work saved');
  for (let i = 0; i < 150; i++) { prior.elements[0].x = i; history.commit(prior); }
  assert.equal(history.states.length, 101);
  let undos = 0; while (history.undo()) undos++;
  assert.equal(undos, 100);
});

test('clipboard roundtrips every property, reuses assets, and generates independent unique IDs', () => {
  const elements = [ { ...text, shadow: true, locked: true, maximizable: false, invertOnHover: true, href: '/zibaldone/notes/', lineHeight: 1.5, letterSpacing: 0.05 }, line,
    { id: 'photo', type: 'image', x: 10, y: -2, width: 3, height: 4, src: '/zibaldone/assets/zion.png', alt: 'photo', lockAspect: true, shadow: true },
    { id: 'old', type: 'line', x1: -4, y1: 1, x2: 4, y2: 1 },
  ];
  const encoded = encodeClipboard(elements), decoded = decodeClipboard(encoded);
  assert.deepEqual(decoded, elements); assert.equal(decodeClipboard('ordinary text'), null);
  let id = 0; const copies = cloneElements(decoded, 1, () => 'copy-' + ++id);
  validatePage(page([...elements, ...copies]));
  assert.equal(new Set(copies.map(e => e.id)).size, copies.length);
  for (let i = 0; i < copies.length; i++) {
    const restored = translateElement(structuredClone(copies[i]), -1, -1); restored.id = elements[i].id;
    assert.deepEqual(restored, elements[i]);
  }
  copies[1].points[0][0] += 10;
  assert.deepEqual(decoded, elements); assert.equal(copies[2].src, elements[2].src);
  assert.throws(() => decodeClipboard(encodeClipboard([text, text])));
});

test('deployment bases resolve canonical JSON URLs without rewriting content', () => {
  for (const base of ['/zibaldone/', '/repository-name/zibaldone/', '/space/', '/repository.name/space/']) {
    assert.equal(normalizeBasePath(base), base);
    assert.equal(spaceURL('/space/field-notes/', base), base + 'field-notes/');
    assert.equal(spaceURL('/space/assets/zion.png', base), base + 'assets/zion.png');
    assert.equal(spaceURL('/zibaldone/field-notes/', base), base + 'field-notes/');
    assert.equal(spaceURL('/zibaldone/assets/zion.png', base), base + 'assets/zion.png');
    assert.equal(spaceURL('https://example.com/', base), 'https://example.com/');
    assert.equal(pageURL('home', base), base + '#/home');
  }
  for (const base of ['/', 'space/', '//elsewhere/', '/space', '/<script>/', '/../zibaldone/']) assert.throws(() => normalizeBasePath(base));
});
