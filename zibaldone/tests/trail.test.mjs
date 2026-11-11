import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute, routeURL, canvasURL } from '../client/routes.js';
import { visitTrail, pageLabel, internalPage } from '../client/trail.js';

test('trail records visits, prunes earlier occurrences, and never mutates prior snapshots', () => {
  const home = visitTrail([], { slug: 'home' });
  const art = visitTrail(home, { slug: 'art', title: 'Art' });
  const comics = visitTrail(art, { slug: 'comics', displayName: 'Comic Studies' });
  assert.deepEqual(comics.map(e => e.slug), ['home', 'art', 'comics']);
  assert.equal(comics.at(-1).label, 'comic studies');
  assert.deepEqual(visitTrail(comics, { slug: 'art' }), art);
  assert.deepEqual(visitTrail(comics, { slug: 'home' }), home);
  assert.deepEqual(visitTrail(art, { slug: 'photography' }).map(e => e.slug), ['home', 'art', 'photography']);
  assert.deepEqual(visitTrail(home, { slug: 'home' }), home);
  assert.equal(comics.length, 3);
  assert.equal(pageLabel({ slug: 'field-notes' }), 'field notes');
});

test('hash destinations preserve origin and base while legacy saved links remain readable', () => {
  const origin = 'https://example.test';
  for (const base of ['/personal/', '/repo/personal/']) {
    assert.equal(internalPage(base, base, origin), 'home');
    assert.equal(internalPage(base + '?edit5500#/home/art', base, origin), 'art');
    assert.equal(internalPage('/space/art/', base, origin), 'art');
    assert.equal(internalPage('/zibaldone/art/', base, origin), 'art');
    for (const href of ['https://elsewhere.test' + base + '#/art', '/outside/', base + 'assets/image.png', base + '#/../art']) assert.equal(internalPage(href, base, origin), null);
  }
});

test('independent canvas IDs resolve every trail, including direct links, pruning and unavailable legacy URLs', () => {
  const known = new Set(['home', 'art', 'comics']);
  for (const hash of ['#/home/art/comics', '#/home/comics', '#/comics']) assert.equal(parseRoute(hash, known).slug, 'comics');
  assert.deepEqual(parseRoute('', known).trail, ['home']);
  assert.deepEqual(parseRoute('#/home/art/home', known).trail, ['home']);
  assert.ok(parseRoute('#/home/missing', known).error);
  assert.ok(parseRoute('#/%ZZ', known).error);
  const legacy = { 'notes/old': { title: 'Old note' }, 'old-home.md': { canvas: 'home' } };
  assert.match(parseRoute('#/notes/old', known, legacy).error, /not been migrated/);
  assert.equal(parseRoute('#old-home.md', known, legacy).slug, 'home');
  assert.equal(routeURL(['home', 'art'], '/personal/', true), '/personal/?edit5500#/home/art');
  assert.equal(canvasURL('/space/art/', ['home', 'art', 'comics']), '/personal/#/home/art');
  assert.equal(canvasURL('/zibaldone/comics/', ['home', 'art']), '/personal/#/home/art/comics');
  assert.equal(canvasURL('https://outside.test/', ['home']), 'https://outside.test/');
});
