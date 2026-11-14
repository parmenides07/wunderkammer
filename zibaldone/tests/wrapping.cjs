const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const canvasReady = require('./navigation.cjs');
const settle = p => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
const state = (p, base = '/personal/') => p.evaluate(async base => {
  const app = await (await import(base + 'client/main.js')).ready;
  const { wrapInterval } = await import(base + 'client/camera.js');
  return { camera: app.camera.value, bounds: app.bounds, limits: wrapInterval(app.bounds, app.camera.size, app.camera.value.zoom), page: app.page };
}, base);
const set = (p, value, base = '/personal/') => p.evaluate(async ({ value, base }) => (await (await import(base + 'client/main.js')).ready).camera.set(value), { value, base });
async function blank(p) {
  const bytes = (await p.locator('#viewport').screenshot()).toString('base64');
  const colored = await p.evaluate(async bytes => {
    // Screenshot inspection only; the actual site still has no canvas renderer.
    const bitmap = await createImageBitmap(new Blob([Uint8Array.from(atob(bytes), c => c.charCodeAt(0))], { type: 'image/png' }));
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height), ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    const data = ctx.getImageData(0, 0, bitmap.width, bitmap.height).data;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i] !== 255 || data[i + 1] !== 255 || data[i + 2] !== 255) count++;
    return count;
  }, bytes);
  assert.equal(colored, 0, 'every canvas pixel must be white at the seam');
}
async function ready(p, base = '/personal/') {
  await canvasReady(p);
  await p.evaluate(async base => {
    await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode().catch(() => {})));
    await (await import(base + 'client/main.js')).ready;
  }, base);
  await settle(p);
  await p.waitForFunction(async base => !!(await (await import(base + 'client/main.js')).ready).bounds, base);
}
async function crosses(p, base, zoom, axis, sign) {
  await set(p, { x: 0, y: 0, zoom }, base); await settle(p);
  const { limits, page } = await state(p, base), [lo, hi] = limits[axis], step = 2 / (24 * zoom);
  const start = { x: 0, y: 0, zoom, [axis]: sign > 0 ? hi - step : lo + step };
  await set(p, start, base); await blank(p);
  await p.evaluate(async base => {
    const app = await (await import(base + 'client/main.js')).ready, camera = app.camera;
    camera.setWheelMode('trackpad'); window.wrapDraws = [];
    if (!camera.originalDraw) { camera.originalDraw = camera.draw; camera.draw = function () { window.wrapDraws.push({ ...this.value }); this.originalDraw(); }; }
  }, base);
  await p.mouse.move(400, 250); await p.mouse.wheel(axis === 'x' ? sign * 4 : 0, axis === 'y' ? sign * 4 : 0); await settle(p);
  const result = (await state(p, base)).camera;
  near(result[axis], sign > 0 ? lo + step : hi - step);
  assert.equal(await p.evaluate(() => window.wrapDraws.length), 1, 'one atomic final draw, no intermediate flash');
  await blank(p);
  assert.equal(await p.locator('#world > .object').count(), page.elements.length);
  assert.equal(await p.evaluate(() => new Set([...document.querySelectorAll('#world > .object')].map(n => n.dataset.id)).size), page.elements.length);
  await p.mouse.wheel(axis === 'x' ? -sign * 4 : 0, axis === 'y' ? -sign * 4 : 0); await settle(p);
  near((await state(p, base)).camera[axis], start[axis]); await blank(p);
}

module.exports = async ({ page, browser, origin, root }) => {
  const fixture = { slug: 'wrap-check', camera: { x: 0, y: 0, zoom: 1 }, elements: [
    { id: 'overflow', type: 'text', x: -5, y: -3, width: 5, height: 1, text: 'Overflow\n'.repeat(12), font: 'baskerville', fontSize: 24, shadow: true, zIndex: 2 },
    { id: 'photo', type: 'image', x: 12, y: -8, width: 9, height: 7, src: '/personal/assets/zion.png', alt: 'Photo', shadow: true },
    { id: 'line', type: 'line', points: [[-20, 3], [-17, -12], [25, -14]], strokeWidth: 5, arrowhead: true, zIndex: -3 },
    { id: 'link', type: 'text', x: 2, y: -5, width: 3, height: 2, text: 'Home', font: 'mono', fontSize: 16, href: '/personal/#/home' },
  ] };
  await fs.writeFile(path.join(root, 'pages/wrap-check.json'), JSON.stringify(fixture));
  await fs.writeFile(path.join(root, 'pages/wrap-empty.json'), JSON.stringify({ ...fixture, slug: 'wrap-empty', elements: [] }));
  await page.goto(origin + '/personal/#/wrap-check'); await ready(page);
  const wheelMode = await page.evaluate(() => localStorage.getItem('space-wheel-mode'));
  const measured = await state(page);
  assert.ok(measured.bounds.minX < -20 - 45 / 24); assert.ok(measured.bounds.minY < -14 - 45 / 24);
  assert.ok(measured.bounds.maxY > fixture.elements[0].y + fixture.elements[0].height + 5, 'text overflow is included');
  for (const zoom of [0.08, 1, 8]) for (const axis of ['x', 'y']) for (const sign of [-1, 1]) await crosses(page, '/personal/', zoom, axis, sign);

  // A late layout change invalidates the cache; camera frames do not measure DOM.
  await set(page, { x: 0, y: 0, zoom: 1 });
  await page.locator('[data-id=overflow] .content').evaluate(n => { n.textContent += '\nLate text'.repeat(30); });
  await page.waitForFunction(async previous => (await (await import('/personal/client/main.js')).ready).bounds?.maxY > previous + 10, measured.bounds.maxY);
  await settle(page); // Let the layout-change observer finish before counting pan frames.
  await page.evaluate(async () => {
    const app = await (await import('/personal/client/main.js')).ready, measure = app.measureBounds.bind(app);
    window.wrapMeasures = 0; app.measureBounds = () => { window.wrapMeasures++; return measure(); };
    for (let i = 0; i < 100; i++) app.camera.pan(0.001, 0.001);
  });
  await settle(page); assert.equal(await page.evaluate(() => window.wrapMeasures), 0);
  await page.locator('[data-id=photo] img').dispatchEvent('load'); await settle(page);
  assert.ok(await page.evaluate(() => window.wrapMeasures > 0));
  await page.evaluate(() => document.fonts.dispatchEvent(new Event('loadingdone'))); await settle(page);
  assert.ok(await page.evaluate(() => window.wrapMeasures > 1));

  // Zoom and resizing in empty space retain the exact position; the next pan
  // begins a new blank crossing instead of normalizing earlier zoom displacement.
  await set(page, { x: 10000, y: 0, zoom: 1 });
  await page.mouse.move(400, 250); await page.keyboard.down('Control'); await page.mouse.wheel(0, -80); await page.keyboard.up('Control'); await settle(page);
  const zoomed = (await state(page)).camera; assert.ok(zoomed.x > 9000); assert.ok(zoomed.zoom > 1);
  await page.setViewportSize({ width: 900, height: 650 }); await settle(page);
  assert.deepEqual((await state(page)).camera, zoomed);
  await page.mouse.wheel(1, 0); await settle(page); await blank(page);
  const returned = await state(page); near(returned.camera.x, returned.limits.x[0] + 1 / (24 * zoomed.zoom));
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.reload(); await ready(page);
  assert.deepEqual((await state(page)).camera, fixture.camera);
  const focusCamera = (await state(page)).camera;
  await page.locator('[data-id=overflow] .content').click(); await page.mouse.wheel(40, 80); await page.keyboard.press('Escape');
  assert.deepEqual((await state(page)).camera, focusCamera);
  await page.locator('[data-id=link] .content').click(); await page.waitForURL('**/home'); await ready(page);
  assert.notDeepEqual((await state(page)).bounds, measured.bounds);
  await page.goBack(); await ready(page); assert.deepEqual((await state(page)).bounds, measured.bounds);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(root, 'pages/wrap-check.json'), 'utf8')), fixture);

  for (const url of ['/personal/#/wrap-empty', '/personal/?edit5500#/wrap-check']) {
    await page.goto(origin + url); await canvasReady(page);
    if (url.includes('edit5500')) await page.waitForSelector('#editor-tools');
    await set(page, { x: 10000, y: -10000, zoom: 1 });
    await page.evaluate(async () => (await (await import('/personal/client/main.js')).ready).camera.setWheelMode('trackpad'));
    await page.mouse.move(800, 300); await page.mouse.wheel(240, -240); await settle(page);
    assert.deepEqual((await state(page)).camera, { x: 10010, y: -10010, zoom: 1 });
  }

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  try {
    const touch = await mobile.newPage(); await touch.goto(origin + '/personal/#/wrap-check'); await ready(touch);
    const cdp = await mobile.newCDPSession(touch);
    const input = async (type, points) => { await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([x, y], i) => ({ x, y, id: i + 1 })) }); await settle(touch); };
    const { limits } = await state(touch);
    await set(touch, { x: limits.x[1] - 0.1, y: 0, zoom: 1 }); await blank(touch);
    await input('touchStart', [[200, 400]]); await input('touchMove', [[190, 400]]); await input('touchEnd', []);
    near((await state(touch)).camera.x, limits.x[0] + 10 / 24 - 0.1); await blank(touch);
    await set(touch, { x: 10000, y: 0, zoom: 1 });
    await input('touchStart', [[100, 400], [200, 400]]); await input('touchMove', [[80, 420], [240, 420]]);
    const pinch = (await state(touch)).camera; near(pinch.zoom, 1.6); assert.ok(pinch.x > 9000);
    await input('touchEnd', []);
    await touch.setViewportSize({ width: 844, height: 390 }); await settle(touch);
    assert.deepEqual((await state(touch)).camera, pinch);
    assert.equal(await touch.locator('#world > .object').count(), fixture.elements.length);
  } finally { await mobile.close(); }
  await page.evaluate(mode => mode === null ? localStorage.removeItem('space-wheel-mode') : localStorage.setItem('space-wheel-mode', mode), wheelMode);
  console.log('Wrapping verified: white seam pixels, one DOM instance/draw, cache invalidation, overflow/shadows/arrows, zoom/resize, focus/routes, editor isolation and mobile pan/pinch.');
};

module.exports.static = async ({ page, origin, base }) => {
  await page.goto(origin + base + '?edit5500#/wrap-check'); await ready(page, base);
  assert.equal(await page.locator('#editor-tools').count(), 0);
  await crosses(page, base, 1, 'x', 1);
};
