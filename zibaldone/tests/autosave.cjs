const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const canvasReady = require('./navigation.cjs');
const gate = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

module.exports = async ({ browser, origin, root }) => {
  const filename = path.join(root, 'pages/autosave-check.json');
  const initial = { slug: 'autosave-check', camera: { x: 0, y: 0, zoom: 1 }, elements: [
    { id: 'note', type: 'text', x: -6, y: -4, width: 12, height: 4, text: 'Before', font: 'mono', fontSize: 16 },
  ] };
  await fs.writeFile(filename, JSON.stringify(initial));
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  let release;
  try {
    const page = await context.newPage(), errors = [], bodies = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', dialog => dialog.accept());
    page.on('request', request => { if (request.method() === 'PUT' && request.url().endsWith('/pages/autosave-check')) bodies.push(JSON.parse(request.postData())); });
    const open = async () => { await page.goto(origin + '/personal/?edit5500#/autosave-check'); await canvasReady(page); await page.waitForSelector('#editor-tools'); };
    const disk = async () => JSON.parse(await fs.readFile(filename, 'utf8'));
    const saved = () => page.waitForFunction(() => document.querySelector('#save-status').textContent === 'Saved');
    const failed = () => page.waitForFunction(() => document.querySelector('#save-status').textContent === 'Save failed');
    const note = () => page.locator('[data-id=note] .content');
    const state = () => page.evaluate(async () => (await (await import('/personal/client/main.js')).ready).page);
    const edit = async text => { await note().dblclick(); await page.keyboard.press('Control+a'); await page.keyboard.insertText(text); };
    await open();
    await edit('Rapid'); await page.keyboard.insertText(' edits'); await page.keyboard.insertText(' together');
    await saved(); assert.equal(bodies.length, 1);
    assert.equal((await disk()).elements[0].text, 'Rapid edits together');
    assert.equal(await note().evaluate(n => n === document.activeElement && n.isContentEditable), true);
    const caret = await page.evaluate(() => getSelection().anchorOffset);
    await page.waitForTimeout(700); assert.equal(await page.evaluate(() => getSelection().anchorOffset), caret);
    await page.keyboard.insertText(' after pause'); await saved(); assert.equal(bodies.length, 2);
    await page.keyboard.press('Control+z'); await saved(); assert.equal((await disk()).elements[0].text, await note().innerText());
    await page.keyboard.press('Escape'); await saved();

    // A complete gesture is one write, even when it lasts longer than debounce.
    await note().click(); let box = await note().boundingBox(), count = bodies.length;
    await page.mouse.move(box.x + 30, box.y + 20); await page.mouse.down();
    await page.mouse.move(box.x + 78, box.y + 44); await page.waitForTimeout(750);
    assert.equal(bodies.length, count); await page.mouse.up(); await saved();
    assert.equal(bodies.length, count + 1); assert.equal((await disk()).elements[0].x, -4);
    box = await page.locator('[data-id=note] [data-handle=both]').boundingBox(); count = bodies.length;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 48, box.y + box.height / 2 + 24); await page.waitForTimeout(750);
    assert.equal(bodies.length, count); await page.mouse.up(); await saved();
    assert.equal((await disk()).elements[0].width, 14);
    await page.keyboard.press('Control+z'); await saved(); assert.equal((await disk()).elements[0].width, 12);
    await page.keyboard.press('Control+Shift+z'); await saved(); assert.equal((await disk()).elements[0].width, 14);

    count = bodies.length;
    await page.evaluate(async () => (await (await import('/personal/client/main.js')).ready).camera.set({ x: 1, y: 2, zoom: 1.2 }));
    await page.waitForTimeout(750); assert.equal(bodies.length, count); assert.deepEqual((await disk()).camera, initial.camera);
    await page.locator('#set-camera').click(); await saved(); assert.deepEqual((await disk()).camera, { x: 1, y: 2, zoom: 1.2 });

    // Editing during a slow save and multiple Save now clicks cannot race PUTs.
    const first = gate(), blocked = gate(); release = first.resolve; let requests = 0, active = 0, peak = 0;
    await page.route('**/_zibaldone/api/pages/autosave-check', async route => {
      if (route.request().method() !== 'PUT') return route.continue();
      active++; peak = Math.max(peak, active); requests++;
      if (requests === 1) { blocked.resolve(); await first.promise; }
      const response = await route.fetch(); await route.fulfill({ response }); active--;
    });
    await page.locator('#prop-fontSize').fill('20'); await page.locator('#prop-fontSize').press('Tab');
    await blocked.promise;
    await page.locator('#prop-fontSize').fill('24'); await page.locator('#prop-fontSize').press('Tab');
    await page.locator('#save-page').click(); await page.locator('#save-page').click();
    first.resolve(); await saved();
    assert.equal(peak, 1); assert.equal(requests, 2); assert.equal((await disk()).elements[0].fontSize, 24);
    await page.unroute('**/_zibaldone/api/pages/autosave-check');

    const upload = gate(), uploading = gate(); release = upload.resolve;
    await page.route('**/_zibaldone/api/images', async route => { uploading.resolve(); await upload.promise; await route.continue(); });
    await page.locator('#image-input').setInputFiles(path.join(root, 'assets/zion.png')); await uploading.promise;
    count = bodies.length; await edit('Text while uploading'); await page.waitForTimeout(750);
    assert.equal(bodies.length, count); assert.equal(await page.locator('#save-status').textContent(), 'Saving...');
    upload.resolve(); await saved(); await page.unroute('**/_zibaldone/api/images');
    const image = (await disk()).elements.find(e => e.type === 'image');
    assert.match(image.src, /^\/personal\/assets\//); await fs.access(path.join(root, 'assets', image.src.split('/').at(-1)));
    assert.equal((await disk()).elements[0].text, 'Text while uploading');

    // Internal departure flushes the unfinished debounce instead of prompting.
    await note().dblclick(); await page.keyboard.insertText(' before navigating');
    await page.locator('#page-picker').selectOption('home'); await page.waitForURL('**/home'); await canvasReady(page);
    assert.match((await disk()).elements[0].text, /before navigating$/);
    await page.goBack(); await canvasReady(page); await page.waitForSelector('#editor-tools');
    assert.match(await note().innerText(), /before navigating$/);
    await page.reload(); await canvasReady(page); await page.waitForSelector('#editor-tools'); await saved();
    assert.deepEqual(await state(), await disk());

    // Transient errors block navigation, retain the draft, and allow a safe retry.
    await page.route('**/_zibaldone/api/pages/autosave-check', route => route.request().method() === 'PUT'
      ? route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"Disk unavailable"}' }) : route.continue());
    await edit('Recoverable draft'); await page.keyboard.press('Escape'); await failed();
    assert.equal(await page.locator('#save-error').isVisible(), true); assert.equal(await page.locator('#download-draft').isVisible(), true);
    await page.locator('#page-picker').selectOption('home'); await failed(); assert.match(page.url(), /autosave-check$/);
    assert.match(await page.evaluate(() => sessionStorage.getItem('zibaldone-draft:/personal/:autosave-check')), /Recoverable draft/);
    await page.unroute('**/_zibaldone/api/pages/autosave-check'); await page.locator('#save-page').click(); await saved();
    assert.equal((await disk()).elements[0].text, 'Recoverable draft');
    assert.equal(await page.evaluate(() => sessionStorage.getItem('zibaldone-draft:/personal/:autosave-check')), null);

    // New pages are persisted immediately, and their first edits autosave too.
    await page.locator('#new-page').click(); await page.locator('#new-slug').fill('autosaved-new');
    await page.locator('#new-page-form button[type=submit]').click(); await page.waitForURL('**/autosaved-new'); await canvasReady(page);
    await page.locator('#add-text').click(); await page.keyboard.insertText('New canvas content'); await saved();
    const created = JSON.parse(await fs.readFile(path.join(root, 'pages/autosaved-new.json'), 'utf8'));
    assert.equal(created.elements[0].text, 'New canvas content');

    // A real external edit causes a revision conflict. Refresh recovery keeps the
    // old revision, so neither retry nor restoring the draft overwrites the disk.
    await open(); const external = await disk(); external.elements[0].text = 'Changed in another editor';
    await fs.writeFile(filename, JSON.stringify(external));
    await edit('Local conflicting draft'); await page.keyboard.press('Escape'); await failed();
    count = bodies.length; await page.locator('#save-page').click(); await page.waitForTimeout(750);
    assert.equal(bodies.length, count); assert.deepEqual(await disk(), external);
    await page.reload(); await canvasReady(page); await page.waitForSelector('#editor-tools'); await failed();
    assert.equal(await note().innerText(), 'Local conflicting draft'); assert.deepEqual(await disk(), external);
    assert.deepEqual(errors, []);
    console.log('Autosave verified: typing/caret, drag/resize, undo/redo, uploads, serialized writes, camera opt-in, navigation/refresh, new canvases, failure recovery and revision conflicts.');
  } finally { release?.(); await context.close(); }
};
