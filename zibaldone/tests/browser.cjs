const canvasReady = require('./navigation.cjs');
// Optional browser QA: npm install --no-save --package-lock=false playwright
// then npx playwright install chromium. No browser dependency is shipped to visitors.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const source = path.resolve(__dirname, '..');
const near = (a, b, tolerance = 1e-7) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);
const state = page => page.evaluate(async () => {
  const app = await (await import('/personal/client/main.js')).ready;
  return { camera: app.camera.value, page: app.page };
});
const ready = async page => { await canvasReady(page); await page.waitForSelector('.object'); await page.evaluate(() => document.fonts.ready); };
const settle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

(async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'space-browser-'));
  let server, staticServer, browser, staticRoot;
  try {
    for (const folder of ['client', 'pages', 'assets']) await fs.cp(path.join(source, folder), path.join(root, folder), { recursive: true });
    // Stable geometry belongs to test fixtures, never to the user's authored pages.
    for (const fixture of JSON.parse(await fs.readFile(path.join(__dirname, 'fixtures.json'), 'utf8')))
      await fs.writeFile(path.join(root, 'pages', `${fixture.slug}.json`), JSON.stringify(fixture));
    const { createSpaceServer } = await import(pathToFileURL(path.join(source, 'server.mjs')));
    server = createSpaceServer({ root });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    // Stable grayscale glyph rasterization keeps screenshot comparisons focused
    // on blending, rather than platform LCD-vs-layer antialiasing differences.
    browser = await chromium.launch({ headless: true, args: ['--disable-lcd-text'], ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
    const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', dialog => dialog.accept());
    await page.goto(origin + '/personal/'); await canvasReady(page);
    await ready(page);
    assert.equal(await page.locator('#editor-tools').count(), 0);
    assert.equal(await page.locator('#world canvas').count(), 0);
    await page.screenshot({ path: '/tmp/space-home-desktop.png' });

    await require('./inversion.cjs')({ page, browser, origin, root });
    await require('./refinements.cjs')({ page, browser, origin, root });
    await require('./authoring.cjs')({ page, browser, origin, root });
    await require('./trail.cjs').local({ browser, origin, root });
    await require('./publish.cjs')({ browser, source });
    await page.goto(origin + '/personal/'); await canvasReady(page); await ready(page);

    const canvasBox = await page.locator('#viewport').boundingBox();
    const center = { x: canvasBox.x + canvasBox.width / 2, y: canvasBox.y + canvasBox.height / 2 };
    // Ordinary trackpad scrolling uses both axes; its accelerated tail keeps panning.
    const scrollBefore = (await state(page)).camera;
    await page.mouse.move(800, 250);
    await page.mouse.wheel(18, 12); await settle(page);
    await page.mouse.wheel(0, 110); await settle(page);
    const scrolled = (await state(page)).camera;
    near(scrolled.zoom, scrollBefore.zoom);
    near(scrolled.x, scrollBefore.x + 18 / (24 * scrollBefore.zoom));
    near(scrolled.y, scrollBefore.y + 122 / (24 * scrollBefore.zoom));
    // Browsers encode trackpad pinch as Ctrl+wheel; the same shortcut is a fallback.
    const pinchAnchor = { x: scrolled.x + (800 - center.x) / (24 * scrolled.zoom), y: scrolled.y + (250 - center.y) / (24 * scrolled.zoom) };
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -20); await settle(page);
    await page.keyboard.up('Control');
    const pinched = (await state(page)).camera;
    assert.ok(pinched.zoom > scrolled.zoom);
    near(pinched.x + (800 - center.x) / (24 * pinched.zoom), pinchAnchor.x);
    near(pinched.y + (250 - center.y) / (24 * pinched.zoom), pinchAnchor.y);
    await page.reload(); await ready(page);

    // Wheel zoom keeps the world coordinate under the pointer stationary.
    const pointer = { x: 800, y: 250 };
    const before = (await state(page)).camera;
    const worldAt = c => ({ x: c.x + (pointer.x - center.x) / (24 * c.zoom), y: c.y + (pointer.y - center.y) / (24 * c.zoom) });
    const anchor = worldAt(before);
    await page.mouse.move(pointer.x, pointer.y);
    for (let i = 0; i < 8; i++) { await page.mouse.wheel(0, i % 2 ? 100 : -100); await settle(page); }
    const after = (await state(page)).camera;
    near(worldAt(after).x, anchor.x);
    near(worldAt(after).y, anchor.y);
    near(after.zoom, before.zoom);

    // Space-pan begun on a real link must not navigate; a subsequent click must.
    const link = page.locator('[data-id=next] .content');
    const box = await link.boundingBox();
    await page.keyboard.down('Space');
    await page.mouse.move(box.x + 20, box.y + 12);
    await page.mouse.down();
    await page.mouse.move(box.x + 80, box.y + 52, { steps: 8 });
    await page.mouse.up();
    await page.keyboard.up('Space');
    assert.equal(new URL(page.url()).pathname, '/personal/');
    const panned = (await state(page)).camera;
    near(panned.x, after.x - 60 / (24 * after.zoom));
    near(panned.y, after.y - 40 / (24 * after.zoom));
    // Middle-button pan remains available and reverses exactly.
    await page.mouse.move(600, 200); await page.mouse.down({ button: 'middle' });
    await page.mouse.move(648, 224, { steps: 4 }); await page.mouse.up({ button: 'middle' });
    const middlePan = (await state(page)).camera;
    near(middlePan.x, panned.x - 48 / (24 * panned.zoom));
    near(middlePan.y, panned.y - 24 / (24 * panned.zoom));
    await page.mouse.down({ button: 'middle' });
    await page.mouse.move(600, 200, { steps: 4 }); await page.mouse.up({ button: 'middle' });
    // Focus uses a separate white scrollable view; the camera never changes.
    await page.waitForTimeout(400);
    await page.locator('[data-id=title] .content').click();
    assert.equal(await page.locator('#focus-view').evaluate(el => el.open), true);
    await page.keyboard.press('Escape');
    assert.deepEqual((await state(page)).camera, panned);
    await link.click();
    await page.waitForURL('**/field-notes'); await canvasReady(page);
    await ready(page);
    assert.deepEqual((await state(page)).camera, (await state(page)).page.camera);
    await page.goBack(); await ready(page);
    assert.equal((await state(page)).page.slug, 'home');
    await page.goForward(); await ready(page);
    await page.reload(); await ready(page);
    assert.equal((await state(page)).page.slug, 'field-notes');
    await page.screenshot({ path: '/tmp/space-field-desktop.png' });
    await page.locator('[data-id=image] .content').click();
    const fit = await page.locator('#focus-content img').evaluate(img => ({ width: img.clientWidth, height: img.clientHeight, ratio: img.naturalWidth / img.naturalHeight }));
    near(fit.width / fit.height, fit.ratio, 0.005);
    assert.ok(fit.height <= 692);
    await page.locator('#close-focus').click();

    await page.goto(origin + '/personal/?edit5500'); await canvasReady(page); await ready(page);
    await page.waitForSelector('#editor-tools');
    // Hardware overrides persist locally, including when the saved page is viewed.
    await page.locator('#wheel-input').selectOption('trackpad');
    await page.reload(); await ready(page); await page.waitForSelector('#editor-tools');
    assert.equal(await page.locator('#wheel-input').inputValue(), 'trackpad');
    const forcedPanBefore = (await state(page)).camera;
    await page.mouse.move(800, 250); await page.mouse.wheel(0, 120); await settle(page);
    const forcedPanAfter = (await state(page)).camera;
    near(forcedPanAfter.zoom, forcedPanBefore.zoom);
    near(forcedPanAfter.y, forcedPanBefore.y + 120 / (24 * forcedPanBefore.zoom));
    await page.locator('#wheel-input').selectOption('mouse');
    await page.goto(origin + '/personal/'); await canvasReady(page); await ready(page);
    const forcedZoomBefore = (await state(page)).camera;
    await page.mouse.move(800, 250); await page.mouse.wheel(0, -6); await settle(page);
    assert.ok((await state(page)).camera.zoom > forcedZoomBefore.zoom);
    await page.goto(origin + '/personal/?edit5500'); await canvasReady(page); await ready(page); await page.waitForSelector('#editor-tools');
    await page.locator('#wheel-input').selectOption('auto');
    // Zoom then drag a linked object. Selection and snapping must use world units.
    await page.mouse.move(600, 400); await page.mouse.wheel(0, -270); await settle(page);
    const zoom = (await state(page)).camera.zoom;
    const linkedObject = page.locator('[data-id=next] .content');
    const linkedBox = await linkedObject.boundingBox();
    const initial = (await state(page)).page.elements.find(e => e.id === 'next');
    await page.mouse.move(linkedBox.x + 20, linkedBox.y + 10);
    await page.mouse.down();
    await page.mouse.move(linkedBox.x + 20 + 24 * zoom * 2.2, linkedBox.y + 10 - 24 * zoom * 1.1, { steps: 8 });
    await page.mouse.up();
    assert.equal(new URL(page.url()).pathname, '/personal/');
    const dragged = (await state(page)).page.elements.find(e => e.id === 'next');
    assert.equal(dragged.x, initial.x + 2);
    assert.equal(dragged.y, initial.y - 1);
    // Resize a centered text object, keeping typography independent.
    const introduction = page.locator('[data-id=introduction] .content');
    const introductionBox = await introduction.boundingBox();
    await introduction.click({ position: { x: introductionBox.width - 12, y: 12 } });
    const oldText = (await state(page)).page.elements.find(e => e.id === 'introduction');
    const handle = page.locator('[data-id=introduction] [data-handle=both]');
    const handleBox = await handle.boundingBox();
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox.x + handleBox.width / 2 + 24 * zoom * 2, handleBox.y + handleBox.height / 2 + 24 * zoom * 1, { steps: 8 });
    await page.mouse.up();
    const resized = (await state(page)).page.elements.find(e => e.id === 'introduction');
    assert.equal(resized.width, oldText.width + 2);
    assert.equal(resized.height, oldText.height + 1);
    assert.equal(resized.fontSize, oldText.fontSize);
    await page.locator('#prop-font').selectOption('baskerville');
    await page.locator('#prop-fontSize').fill('20');
    await page.locator('#prop-fontSize').press('Tab');
    await page.locator('#prop-align').selectOption('center');
    const restyled = (await state(page)).page.elements.find(e => e.id === 'introduction');
    assert.equal(restyled.width, resized.width);
    assert.equal(restyled.height, resized.height);
    assert.equal(restyled.fontSize, 20);
    assert.equal(restyled.font, 'baskerville');
    assert.equal(restyled.align, 'center');

    // In-place multiline editing must consume Space/Delete/Enter as text input.
    await page.locator('#edit-text').click();
    const content = page.locator('[data-id=introduction] .content');
    await page.keyboard.press('Control+a');
    await page.keyboard.insertText('An edited line');
    await page.keyboard.press('Enter');
    await page.keyboard.insertText('Second line');
    await page.keyboard.press('Space');
    await page.keyboard.press('Delete');
    assert.match((await state(page)).page.elements.find(e => e.id === 'introduction').text, /An edited line\nSecond line/);
    assert.equal(await page.locator('.pan-ready').count(), 0);
    await page.keyboard.press('Escape');
    // Double-click blank space creates text and enters editing immediately.
    const count = (await state(page)).page.elements.length;
    await page.mouse.dblclick(950, 300);
    assert.equal((await state(page)).page.elements.length, count + 1);
    await page.keyboard.insertText('Created in empty space');
    await page.keyboard.press('Escape');
    await page.locator('#image-input').setInputFiles(path.join(root, 'assets/zion.png'));
    await page.waitForFunction(() => document.querySelector('#save-status').textContent.includes('Image added'));
    const imageElement = (await state(page)).page.elements.at(-1);
    assert.equal(imageElement.type, 'image');
    await page.locator('#prop-width').fill('15');
    await page.locator('#prop-width').press('Tab');
    const imageResized = (await state(page)).page.elements.at(-1);
    near(imageResized.width / imageResized.height, imageElement.width / imageElement.height);
    await page.locator('#prop-alt').fill('Uploaded test image');
    await page.locator('#prop-alt').press('Tab');
    await page.locator('#set-camera').click();
    await page.locator('#save-page').click();
    await page.waitForFunction(() => document.querySelector('#save-status').textContent.startsWith('Saved to'));
    const saved = await state(page);
    await page.reload(); await ready(page); await page.waitForSelector('#editor-tools');
    assert.deepEqual((await state(page)).page, saved.page);
    assert.deepEqual((await state(page)).camera, saved.page.camera);
    await page.screenshot({ path: '/tmp/space-editor-desktop.png' });
    // Dropped files become ordinary local assets; delete removes only the object.
    const beforeDrop = (await state(page)).page.elements.length;
    await page.evaluate(() => {
      const transfer = new DataTransfer();
      const bytes = Uint8Array.from(atob('R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=='), c => c.charCodeAt(0));
      transfer.items.add(new File([bytes], 'drop.gif', { type: 'image/gif' }));
      document.querySelector('#viewport').dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: transfer, clientX: 900, clientY: 300 }));
    });
    await page.waitForFunction(count => document.querySelectorAll('.object').length === count, beforeDrop + 1);
    const dropped = (await state(page)).page.elements.at(-1);
    assert.match(dropped.src, /\.gif$/);
    await page.locator('#delete-object').click();
    assert.equal((await state(page)).page.elements.length, beforeDrop);
    // New page is immediately a real, reloadable route.
    await page.locator('#new-page').click();
    await page.locator('#new-slug').fill('browser-created');
    await page.locator('#new-page-form button[type=submit]').click();
    await page.waitForURL('**/browser-created'); await canvasReady(page);
    await page.waitForSelector('#editor-tools');
    await page.locator('#add-text').click();
    await page.keyboard.insertText(('A readable paragraph. '.repeat(20) + '\n\n').repeat(20));
    await page.keyboard.press('Escape');
    await page.locator('#save-page').click();
    await page.waitForFunction(() => document.querySelector('#save-status').textContent.startsWith('Saved to'));
    assert.equal(await page.locator('[data-overflow=true]').count(), 1);

    // Touch input via Chromium's actual touch-event pipeline: one-finger pan only.
    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    const touchPage = await mobile.newPage();
    touchPage.on('pageerror', e => errors.push(e.message));
    await touchPage.goto(origin + '/personal/#/field-notes'); await canvasReady(touchPage); await ready(touchPage);
    await touchPage.screenshot({ path: '/tmp/space-mobile.png' });
    const mobileState = await state(touchPage);
    assert.equal(await touchPage.locator('#viewport').evaluate(el => getComputedStyle(el).touchAction), 'pinch-zoom');
    assert.doesNotMatch(await touchPage.locator('meta[name=viewport]').getAttribute('content'), /user-scalable|maximum-scale/);
    // Mobile renders exactly the authored coordinates, never a stacked alternative.
    assert.equal(await touchPage.locator('[data-id=heading]').evaluate(el => el.style.left), '-144px');
    const cdp = await mobile.newCDPSession(touchPage);
    const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map((p, i) => ({ x: p[0], y: p[1], id: i + 1 })) });
    await touch('touchStart', [[60, 650]]);
    await touch('touchMove', [[108, 674]]);
    await touch('touchEnd', []);
    const pan = (await state(touchPage)).camera;
    near(pan.x, mobileState.camera.x - 48 / (24 * pan.zoom));
    near(pan.y, mobileState.camera.y - 24 / (24 * pan.zoom));
    await touch('touchStart', [[100, 450], [220, 450]]);
    await touch('touchMove', [[60, 470], [300, 470]]);
    await touch('touchEnd', []);
    const pinch = (await state(touchPage)).camera;
    assert.deepEqual(pinch, pan);
    const nativeWheelAllowed = await touchPage.evaluate(() => {
      const event = new WheelEvent('wheel', { ctrlKey: true, deltaY: -30, bubbles: true, cancelable: true });
      document.querySelector('#viewport').dispatchEvent(event);
      return !event.defaultPrevented;
    });
    assert.equal(nativeWheelAllowed, true);
    assert.deepEqual((await state(touchPage)).camera, pan);
    // Restore only the browser's native magnification before further test actions.
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
    // Long text reflows at readable size and scrolls; Close restores the exact camera.
    await touchPage.goto(origin + '/personal/#/browser-created'); await canvasReady(touchPage); await ready(touchPage);
    const essayCamera = (await state(touchPage)).camera;
    await touchPage.locator('.content').tap({ position: { x: 15, y: 15 } });
    const essay = await touchPage.locator('#focus-view').evaluate(el => ({ scroll: el.scrollHeight, height: el.clientHeight, width: el.scrollWidth }));
    assert.ok(essay.scroll > essay.height * 2);
    assert.ok(essay.width <= 390);
    assert.ok(await touchPage.locator('#focus-content > div').evaluate(el => parseFloat(getComputedStyle(el).fontSize)) >= 16);
    await touchPage.locator('#focus-view').evaluate(el => { el.scrollTop = 500; });
    assert.equal(await touchPage.locator('#focus-view').evaluate(el => el.scrollTop), 500);
    await touchPage.locator('#close-focus').tap();
    assert.deepEqual((await state(touchPage)).camera, essayCamera);
    await touchPage.goto(origin + '/personal/#/field-notes'); await canvasReady(touchPage); await ready(touchPage);
    await touchPage.locator('[data-id=home] .content').tap({ position: { x: 20, y: 12 } });
    await touchPage.waitForURL('**/home'); await canvasReady(touchPage); await ready(touchPage);
    await touchPage.goto(origin + '/personal/?edit5500#/field-notes'); await canvasReady(touchPage); await ready(touchPage);
    await touchPage.waitForSelector('#editor-tools');
    await touchPage.locator('#editor-tools summary').tap();
    await touchPage.locator('[data-id=heading] .content').tap({ position: { x: 20, y: 20 } });
    const headingBefore = (await state(touchPage)).page.elements.find(e => e.id === 'heading');
    await touch('touchStart', [[100, 320]]);
    await touch('touchMove', [[124, 344]]);
    await touch('touchEnd', []);
    const headingAfter = (await state(touchPage)).page.elements.find(e => e.id === 'heading');
    assert.equal(headingAfter.x, headingBefore.x + 1);
    assert.equal(headingAfter.y, headingBefore.y + 1);
    // A second finger cancels an object move without changing the canvas camera.
    const editorTouchCamera = (await state(touchPage)).camera;
    await touch('touchStart', [[120, 340]]);
    await touch('touchMove', [[144, 340]]);
    await touch('touchStart', [[144, 340], [250, 340]]);
    await touch('touchMove', [[100, 340], [290, 340]]);
    await touch('touchEnd', []);
    const headingAfterPinch = (await state(touchPage)).page.elements.find(e => e.id === 'heading');
    assert.deepEqual(headingAfterPinch, headingAfter);
    assert.deepEqual((await state(touchPage)).camera, editorTouchCamera);
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
    await touchPage.locator('#edit-text').tap();
    await touchPage.keyboard.insertText(' — touch editing');
    assert.match((await state(touchPage)).page.elements.find(e => e.id === 'heading').text, /touch editing$/);
    assert.deepEqual((await state(touchPage)).camera, editorTouchCamera);
    await mobile.close();

    // Verify actual static hosting: direct URLs/reloads work; ?edit5500 exposes nothing.
    const { build } = await import(pathToFileURL(path.join(source, 'build.mjs')));
    const dist = staticRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'personal-static-'));
    await build({ source: root, output: path.join(dist, 'personal') });
    staticServer = http.createServer(async (req, res) => {
      try {
        const pathname = new URL(req.url, 'http://localhost').pathname;
        const file = path.join(dist, pathname + (pathname.endsWith('/') ? 'index.html' : ''));
        const type = { '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.html': 'text/html' }[path.extname(file)] || 'application/octet-stream';
        const bytes = await fs.readFile(file);
        res.writeHead(200, { 'Content-Type': type }); res.end(bytes);
      } catch { res.writeHead(404); res.end(); }
    });
    await new Promise(resolve => staticServer.listen(0, '127.0.0.1', resolve));
    const staticOrigin = `http://127.0.0.1:${staticServer.address().port}`;
    await page.goto(staticOrigin + '/personal/?edit5500#/field-notes'); await canvasReady(page); await ready(page);
    await page.reload(); await ready(page);
    assert.equal(await page.locator('#editor-tools').count(), 0);
    for (const route of ['/personal/client/editor.js', '/personal/client/editor.css', '/personal/client/history.js', '/personal/client/clipboard.js', '/personal/server.mjs', '/personal/publish.mjs', '/_zibaldone/api/publish', '/_zibaldone/api/pages']) assert.equal((await fetch(staticOrigin + route)).status, 404);
    await page.goto(staticOrigin + '/personal/#/refinements'); await canvasReady(page); await ready(page);
    assert.equal(await page.locator('.line-ink').count(), 1);
    assert.equal(await page.locator('.line-hit').evaluate(el => getComputedStyle(el).display), 'none');
    assert.equal(await page.locator('[data-id=inert] .focus-object').count(), 0);
    // GitHub project Pages mounts this same artifact under /repository-name/.
    await build({ source: root, output: path.join(dist, 'repository-name', 'personal'), basePath: '/repository-name/personal/' });
    await page.goto(staticOrigin + '/repository-name/personal/?edit#/field-notes'); await canvasReady(page); await ready(page);
    await page.reload(); await ready(page);
    assert.equal(await page.locator('#editor-tools').count(), 0);
    assert.ok(await page.locator('[data-id=image] img').evaluate(img => img.complete && img.naturalWidth > 0));
    assert.ok(await page.evaluate(() => document.fonts.check('16px "JetBrains Mono"')));
    assert.equal(await page.locator('[data-id=home] .content').getAttribute('href'), '/repository-name/personal/#/field-notes/home');
    await page.locator('[data-id=image] .content').click();
    assert.match(await page.locator('#focus-content img').getAttribute('src'), /^\/repository-name\/personal\/assets\//);
    await page.keyboard.press('Escape');
    const transform = await page.locator('#world').getAttribute('style');
    await page.mouse.move(800, 250); await page.mouse.wheel(15, 10); await settle(page);
    assert.notEqual(await page.locator('#world').getAttribute('style'), transform);
    await page.locator('[data-id=home] .content').click(); await page.waitForURL('**/home'); await canvasReady(page); await ready(page);
    await page.goBack(); await ready(page); await page.goForward(); await ready(page);
    await page.goto(staticOrigin + '/repository-name/personal/?edit5500'); await canvasReady(page); await ready(page);
    assert.equal(await page.locator('#editor-tools').count(), 0);
    for (const base of ['/personal/', '/repository-name/personal/'])
      await require('./trail.cjs').static({ browser, origin: staticOrigin, base });
    assert.deepEqual(errors, []);
    console.log('Browser checks passed: wheel/trackpad modes, pointer zoom, link feedback, focus, editing, save/reload, touch pan without canvas zoom, native zoom access, static isolation.');
    console.log('Screenshots: /tmp/space-{home-desktop,field-desktop,editor-desktop,mobile}.png');
  } finally {
    await browser?.close();
    if (server) await new Promise(resolve => server.close(resolve));
    if (staticServer) await new Promise(resolve => staticServer.close(resolve));
    await fs.rm(root, { recursive: true, force: true });
    if (staticRoot) await fs.rm(staticRoot, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
