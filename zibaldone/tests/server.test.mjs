import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, writeFile, readFile, readdir, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import { createSpaceServer } from '../server.mjs';
import { build } from '../build.mjs';

const source = fileURLToPath(new URL('../', import.meta.url));

test('local authoring roundtrip, upload, conflicts, validation, and request boundaries', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'space-api-'));
  for (const folder of ['client', 'pages', 'assets']) await cp(path.join(source, folder), path.join(root, folder), { recursive: true });
  const server = createSpaceServer({ root });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await rm(root, { recursive: true, force: true }); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const html = await (await fetch(origin + '/personal/?edit5500')).text();
  assert.match(html, /client\/editor.js/);
  assert.doesNotMatch(await (await fetch(origin + '/personal/?edit')).text(), /editor.js|editor.css|zibaldone-editor-token/);
  const token = html.match(/name="zibaldone-editor-token" content="([^"]+)"/)[1];
  const headers = { 'X-Zibaldone-Token': token, 'Content-Type': 'application/json' };
  const get = await fetch(origin + '/personal/pages/home.json');
  const page = await get.json();
  const revision = get.headers.get('ETag');
  page.elements[0].text = 'Saved\nfrom the editor';
  assert.equal((await fetch(origin + '/_zibaldone/api/pages')).status, 403);
  assert.equal((await fetch(origin + '/_zibaldone/api/pages', { headers: { ...headers, Origin: 'https://evil.example' } })).status, 403);
  const badHostStatus = await new Promise(resolve => {
    http.get(origin + '/personal/', { headers: { Host: 'evil.example' } }, response => { response.resume(); resolve(response.statusCode); });
  });
  assert.equal(badHostStatus, 403);
  const save = () => fetch(origin + '/_zibaldone/api/pages/home', { method: 'PUT', headers: { ...headers, 'If-Match': revision }, body: JSON.stringify(page) });
  const concurrent = await Promise.all([save(), save()]);
  assert.deepEqual(concurrent.map(r => r.status).sort(), [200, 409]);
  assert.equal(JSON.parse(await readFile(path.join(root, 'pages/home.json'), 'utf8')).elements[0].text, page.elements[0].text);
  assert.equal((await fetch(origin + '/personal/pages/home.json')).status, 200);
  const newPage = { slug: 'new-canvas', camera: { x: -400, y: 100, zoom: 0.4 }, elements: [
    { id: 'saved-line', type: 'line', x1: -8, y1: 4, x2: 3, y2: -2, strokeStyle: 'dashed', strokeWidth: 2, arrowhead: true, zIndex: -2 },
    { ...page.elements[0], id: 'options', zIndex: 3, maximizable: false, invertOnHover: true, shadow: true, locked: true, lineHeight: 1.25, letterSpacing: -0.02 },
    { id: 'poly', type: 'line', points: [[1, 2], [3, 2], [3, 4]], locked: true },
  ] };
  const create = () => fetch(origin + '/_zibaldone/api/pages/new-canvas', { method: 'PUT', headers: { ...headers, 'If-None-Match': '*' }, body: JSON.stringify(newPage) });
  assert.equal((await create()).status, 200);
  assert.deepEqual(await (await fetch(origin + '/personal/pages/new-canvas.json')).json(), newPage);
  assert.equal((await create()).status, 409);
  assert.equal((await fetch(origin + '/personal/#/new-canvas')).status, 200);
  assert.equal((await fetch(origin + '/_zibaldone/api/pages/new-canvas', { method: 'PUT', headers, body: JSON.stringify({ ...newPage, slug: '../escape' }) })).status, 400);
  const bytes = await readFile(path.join(root, 'assets/zion.png'));
  const upload = await fetch(origin + '/_zibaldone/api/images', { method: 'POST', headers, body: bytes });
  assert.equal(upload.status, 201);
  const { src } = await upload.json();
  assert.deepEqual(Buffer.from(await (await fetch(origin + src)).arrayBuffer()), bytes);
  assert.equal((await fetch(origin + '/_zibaldone/api/images', { method: 'POST', headers, body: '<svg onload="evil()"/>' })).status, 400);
  await symlink(path.join(root, 'pages/home.json'), path.join(root, 'pages/symlink.json'));
  assert.equal((await fetch(origin + '/_zibaldone/api/pages/symlink', { method: 'PUT', headers, body: JSON.stringify({ ...newPage, slug: 'symlink' }) })).status, 403);
  assert.equal((await fetch(origin + '/personal/server.mjs')).status, 404);
  assert.ok(!(await (await fetch(origin + '/personal/')).text()).includes('editor.js'));
});

test('static output has real routes and excludes editor, server, and write APIs', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'space-build-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const output = path.join(root, 'zibaldone');
  await build({ output });
  const html = await readFile(path.join(output, 'index.html'), 'utf8');
  assert.match(html, /data-slug="home"/);
  assert.doesNotMatch(html, /editor|token|_space\/api/);
  assert.deepEqual((await readdir(path.join(output, 'client'))).sort(), ['camera.js', 'main.js', 'model.js', 'routes.js', 'style.css', 'trail.js']);
  await assert.rejects(readFile(path.join(output, 'server.mjs')));
  await assert.rejects(readFile(path.join(output, 'publish.mjs')));
  await build({ output, basePath: '/repository-name/personal/' });
  const prefixed = await readFile(path.join(output, 'index.html'), 'utf8');
  assert.match(prefixed, /data-space-base="\/repository-name\/personal\/"/);
  assert.match(prefixed, /src="\/repository-name\/personal\/client\/main.js"/);
  const published = JSON.parse(await readFile(path.join(output, 'pages/home.json'), 'utf8'));
  const originalPage = JSON.parse(await readFile(path.join(source, 'pages/home.json'), 'utf8'));
  assert.deepEqual(published.camera, originalPage.camera);
  assert.equal(published.elements.length, originalPage.elements.length);
  assert.doesNotMatch(JSON.stringify(published), /\/space\/|\/zibaldone\//);
  for (const basePath of ['/personal/', '/repository.name/personal/']) {
    await build({ output, basePath });
    const alias = await readFile(path.join(output, 'index.html'), 'utf8');
    assert.ok(alias.includes(`data-space-base="${basePath}"`));
    assert.ok(alias.includes(`src="${basePath}client/main.js"`));
  }
  const original = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try { assert.throws(() => createSpaceServer(), /development-only/); }
  finally { if (original === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = original; }
});


test('building cannot overwrite source, and a bad link leaves existing output intact', async t => {
  const temp = await mkdtemp(path.join(tmpdir(), 'zibaldone-build-safety-'));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const input = path.join(temp, 'zibaldone'), output = path.join(temp, 'personal');
  await cp(source, input, { recursive: true });
  await build({ source: input, output });
  const before = await readFile(path.join(output, 'index.html'));
  await assert.rejects(build({ source: input, output: input }), /separate from/);
  await assert.rejects(build({ source: input, output: temp }), /separate from/);
  const homePath = path.join(input, 'pages/home.json'), home = JSON.parse(await readFile(homePath, 'utf8'));
  home.elements.push({ id: 'missing', type: 'text', x: 0, y: 0, width: 1, height: 1, font: 'mono', fontSize: 16, text: 'missing', href: '/personal/#/missing' });
  await writeFile(homePath, JSON.stringify(home));
  await assert.rejects(build({ source: input, output }), /missing canvas/);
  assert.deepEqual(await readFile(path.join(output, 'index.html')), before);
  assert.deepEqual(JSON.parse(await readFile(homePath, 'utf8')), home);
});
