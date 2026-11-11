const canvasReady = require('./navigation.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const state = page => page.evaluate(async () => {
  const app = await (await import('/personal/client/main.js')).ready;
  return { page: app.page, camera: app.camera.value };
});
const ready = async page => { await canvasReady(page); await page.waitForSelector('.object'); await page.evaluate(() => document.fonts.ready); };
const object = (page, id) => page.locator(`[data-id="${id}"]`);
const selected = page => page.locator('.object.selected').getAttribute('data-id');
const value = async (page, id) => { const e = (await state(page)).page.elements.find(e => e.id === id); return e?.points ? { ...e, x1: e.points[0][0], y1: e.points[0][1], x2: e.points.at(-1)[0], y2: e.points.at(-1)[1] } : e; };
const setField = async (page, name, value) => { await page.locator('#prop-' + name).fill(String(value)); await page.locator('#prop-' + name).press('Tab'); };
const save = async page => { await page.locator('#save-page').click(); await page.waitForFunction(() => document.querySelector('#save-status').textContent.startsWith('Saved to')); };
const point = async (page, x, y) => {
  const c = (await state(page)).camera, size = await page.locator('#viewport').boundingBox();
  return { x: size.x + size.width / 2 + (x - c.x) * 24 * c.zoom, y: size.y + size.height / 2 + (y - c.y) * 24 * c.zoom };
};
const drag = async (page, from, to) => { await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move(to.x, to.y, { steps: 8 }); await page.mouse.up(); };
const scale = async (page, id, expected) => page.waitForFunction(({ id, expected }) => {
  const transform = getComputedStyle(document.querySelector(`[data-id="${id}"] img`)).transform;
  return Math.abs((transform === 'none' ? 1 : new DOMMatrix(transform).a) - expected) < 0.000001;
}, { id, expected });

module.exports = async ({ page, browser, origin, root }) => {
  const text = (id, x, y, extra = {}) => ({ id, type: 'text', x, y, width: 10, height: 3, text: id, font: 'mono', fontSize: 18, ...extra });
  const image = (id, x, y, extra = {}) => ({ id, type: 'image', x, y, width: 5, height: 4, src: '/personal/assets/zion.png', alt: id, ...extra });
  const fixture = { slug: 'refinements', camera: { x: 0, y: 0, zoom: 1 }, elements: [
    text('legacy', -18, -9),
    text('inert', -18, -4, { maximizable: false, invertOnHover: true }),
    text('opt-in', -18, 2, { invertOnHover: true }),
    text('linked', -18, 7, { maximizable: false, href: '/personal/#/field-notes' }),
    image('still-image', 8, -8, { maximizable: false }),
    image('image', 8, -2),
    image('linked-image', 8, 5, { maximizable: false, href: '/personal/#/field-notes' }),
    text('front', -2, -6, { width: 8, height: 4, zIndex: 2 }),
    text('back', -2, -6, { width: 8, height: 4 }),
    { id: 'diagonal', type: 'line', x1: -1, y1: 2, x2: 5, y2: 6, zIndex: 4, arrowhead: true },
  ] };
  await fs.writeFile(path.join(root, 'pages/refinements.json'), JSON.stringify(fixture));
  const open = async (edit = false) => { await page.goto(origin + '/personal/' + (edit ? '?edit5500' : '') + '#/refinements'); await canvasReady(page); await ready(page); if (edit) await page.waitForSelector('#editor-tools'); };
  await open();
  await object(page, 'legacy').locator('.content').hover();
  assert.equal(await page.locator('#viewport').getAttribute('data-feedback'), null);
  assert.equal(await object(page, 'legacy').evaluate(el => getComputedStyle(el).zIndex), '0');
  assert.equal(await object(page, 'legacy').locator('.focus-object').count(), 1);
  await object(page, 'legacy').locator('.content').click();
  assert.equal(await page.locator('#focus-view').evaluate(el => el.open), true);
  await page.keyboard.press('Escape');

  for (const id of ['inert', 'still-image']) {
    const content = object(page, id).locator('.content');
    await content.hover();
    assert.equal(await content.evaluate(el => getComputedStyle(el).cursor), 'default');
    assert.equal(await content.evaluate(el => el.tabIndex), -1);
    assert.equal(await object(page, id).locator('.focus-object').count(), 0);
    assert.equal(await page.locator('#viewport').getAttribute('data-feedback'), null);
    await content.click();
    assert.equal(await page.locator('#focus-view').evaluate(el => el.open), false);
  }
  await scale(page, 'still-image', 1);
  await page.evaluate(async () => {
    const app = await (await import('/personal/client/main.js')).ready;
    app.focus(app.page.elements.find(e => e.id === 'inert'));
  });
  assert.equal(await page.locator('#focus-view').evaluate(el => el.open), false);
  await object(page, 'opt-in').locator('.content').hover();
  assert.equal(await page.locator('#viewport').getAttribute('data-feedback'), 'opt-in');

  const photoBox = await object(page, 'image').boundingBox();
  await object(page, 'image').locator('.content').hover(); await scale(page, 'image', 1.025);
  assert.equal(await page.locator('#viewport').getAttribute('data-feedback'), null);
  assert.deepEqual(await object(page, 'image').boundingBox(), photoBox);
  const scaled = await object(page, 'image').locator('img').boundingBox();
  assert.ok(Math.abs(scaled.width / photoBox.width - 1.025) < 0.00001);
  assert.ok(Math.abs(scaled.x + scaled.width / 2 - photoBox.x - photoBox.width / 2) < 0.001);
  assert.equal(await object(page, 'image').locator('img').evaluate(el => getComputedStyle(el).transitionDuration), '0.15s');
  await page.emulateMedia({ reducedMotion: 'reduce' }); await scale(page, 'image', 1);
  assert.equal(await object(page, 'image').locator('img').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.mouse.move(10, 10); await object(page, 'image').locator('.content').focus();
  await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab'); await scale(page, 'image', 1.025);
  await page.keyboard.press('Enter'); assert.equal(await page.locator('#focus-view').evaluate(el => el.open), true);
  await page.keyboard.press('Escape');
  await object(page, 'linked').locator('.content').hover();
  await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-id=linked] .content')).color === 'rgb(163, 58, 50)');
  assert.equal(await object(page, 'linked').locator('.focus-object').count(), 0);
  await object(page, 'linked').locator('.content').click(); await page.waitForURL('**/field-notes'); await canvasReady(page);
  await open();
  await object(page, 'linked').locator('.content').focus(); await page.keyboard.press('Enter'); await page.waitForURL('**/field-notes'); await canvasReady(page);
  await open();
  await object(page, 'linked-image').locator('.content').hover(); await scale(page, 'linked-image', 1.025);
  assert.equal(await object(page, 'linked-image').locator('.focus-object').count(), 0);
  await object(page, 'linked-image').locator('.content').click(); await page.waitForURL('**/field-notes'); await canvasReady(page);

  await open(true);
  // An element's selected state never promotes it above its authored Z-index.
  await page.mouse.click(600, 280); assert.equal(await selected(page), 'front');
  await page.locator('#send-backward').click(); await page.locator('#send-backward').click();
  assert.equal((await value(page, 'front')).zIndex, 0);
  await page.mouse.click(600, 280); assert.equal(await selected(page), 'back');
  await page.locator('#bring-forward').click(); assert.equal((await value(page, 'back')).zIndex, 1);
  await setField(page, 'zIndex', -2);
  await page.mouse.click(600, 280); assert.equal(await selected(page), 'front');
  await setField(page, 'zIndex', 3);
  // Authoring toggles are available without changing text geometry or links.
  await object(page, 'inert').locator('.content').click();
  await page.locator('#prop-maximizable').check();
  await page.locator('#prop-invertOnHover').uncheck();
  assert.equal((await value(page, 'inert')).maximizable, true);
  assert.equal((await value(page, 'inert')).invertOnHover, false);
  await page.locator('#prop-maximizable').uncheck();
  assert.equal(await page.locator('#focus-selected').isVisible(), false);

  // Endpoint handles and stroke hit testing use the camera's world transform.
  await page.evaluate(async () => (await (await import('/personal/client/main.js')).ready).camera.set({ x: 1.25, y: -0.5, zoom: 1.6 }));
  await page.locator('#add-line').click();
  await page.locator('#line-mode').selectOption('direct');
  const from = await point(page, 1, 0), to = await point(page, 7, 0);
  await page.mouse.click(from.x, from.y); await page.mouse.click(to.x, to.y); await page.keyboard.press('Enter');
  const id = await selected(page);
  const start = await value(page, id);
  assert.equal(start.type, 'line'); assert.equal(start.x2 - start.x1, 6);
  assert.equal(await page.locator('#prop-strokeWidth').inputValue(), '1');
  await setField(page, 'zIndex', 10);
  await drag(page, await point(page, start.x2, start.y2), await point(page, start.x2 + 1.4, start.y2 + 2.2));
  const endpoint = await value(page, id);
  assert.equal(endpoint.x2, start.x2 + 1); assert.equal(endpoint.y2, start.y2 + 2);
  assert.equal(endpoint.x1, start.x1); assert.equal(endpoint.y1, start.y1);
  // Move the endpoint across the origin to exercise reversed SVG coordinates.
  await drag(page, await point(page, endpoint.x2, endpoint.y2), await point(page, -2, 2));
  assert.equal((await value(page, id)).x2, -2);
  await setField(page, 'strokeWidth', 2); await page.locator('#prop-strokeStyle').selectOption('dashed');
  await page.locator('#prop-arrowhead').check();
  const ink = object(page, id).locator('.line-ink');
  assert.equal(await ink.getAttribute('stroke-dasharray'), '12 8');
  assert.match(await ink.getAttribute('marker-end'), /^url\(#arrow-/);
  assert.ok((await ink.getAttribute('points')).split(' ').at(-1).startsWith('0,'));
  await page.locator('#prop-strokeStyle').selectOption('dotted');
  assert.equal(await ink.getAttribute('stroke-dasharray'), '0 6');
  assert.equal(await ink.getAttribute('stroke-linecap'), 'round');
  const beforeMove = await value(page, id);
  const middle = await point(page, (beforeMove.x1 + beforeMove.x2) / 2, (beforeMove.y1 + beforeMove.y2) / 2);
  const end = { x: middle.x + 3 * 24 * 1.6, y: middle.y - 2 * 24 * 1.6 };
  await drag(page, middle, end);
  const moved = await value(page, id);
  for (const key of ['x1', 'x2']) assert.equal(moved[key], beforeMove[key] + 3);
  for (const key of ['y1', 'y2']) assert.equal(moved[key], beforeMove[key] - 2);
  // A diagonal line's empty bounding-box region must not intercept selection.
  const empty = await point(page, Math.min(moved.x1, moved.x2) + 0.2, Math.min(moved.y1, moved.y2) + 0.2);
  assert.notEqual(await page.evaluate(p => document.elementFromPoint(p.x, p.y)?.closest('.object')?.dataset.id, empty), id);
  await page.locator('#set-camera').click(); await save(page);
  const saved = (await state(page)).page;
  await page.reload(); await ready(page); await page.waitForSelector('#editor-tools');
  assert.deepEqual((await state(page)).page, saved);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(root, 'pages/refinements.json'), 'utf8')), saved);
  const loadedLine = await value(page, id);
  const center = await point(page, (loadedLine.x1 + loadedLine.x2) / 2, (loadedLine.y1 + loadedLine.y2) / 2);
  await page.mouse.click(center.x, center.y); assert.equal(await selected(page), id);
  await page.screenshot({ path: '/tmp/space-lines-editor.png' });
  const viewer = await page.context().newPage();
  try {
    await viewer.goto(origin + '/personal/#/refinements'); await canvasReady(viewer); await ready(viewer);
    await viewer.screenshot({ path: '/tmp/space-lines-viewer.png' });
    assert.equal(await object(viewer, id).locator('.line-hit').evaluate(el => getComputedStyle(el).display), 'none');
    assert.equal(await object(viewer, id).evaluate(el => getComputedStyle(el).zIndex), '10');
  } finally { await viewer.close(); }
  await page.keyboard.press('Delete'); assert.equal(await object(page, id).count(), 0);
  await save(page);

  const mobileFixture = { slug: 'touch-refinements', camera: { x: 0, y: 0, zoom: 1 }, elements: [
    text('inert', -5, -6, { maximizable: false, invertOnHover: true }),
    image('inert-image', -5, 0, { width: 4, maximizable: false }),
    image('linked-image', 1, 0, { width: 4, maximizable: false, href: '/personal/' }),
    text('linked', -5, 6, { maximizable: false, href: '/personal/' }),
    { id: 'line', type: 'line', x1: -4, y1: -2, x2: 4, y2: -2 },
  ] };
  await fs.writeFile(path.join(root, 'pages/touch-refinements.json'), JSON.stringify(mobileFixture));
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  try {
    const touchPage = await mobile.newPage();
    const openTouch = async edit => { await touchPage.goto(origin + '/personal/' + (edit ? '?edit5500' : '') + '#/touch-refinements'); await canvasReady(touchPage); await ready(touchPage); };
    await openTouch(false);
    for (const id of ['inert', 'inert-image']) {
      await object(touchPage, id).locator('.content').tap();
      assert.equal(await touchPage.locator('#focus-view').evaluate(el => el.open), false);
      assert.equal(await touchPage.locator('#viewport').getAttribute('data-feedback'), null);
    }
    await object(touchPage, 'linked-image').locator('.content').hover(); await scale(touchPage, 'linked-image', 1);
    await object(touchPage, 'linked-image').locator('.content').tap(); await touchPage.waitForURL('**/home'); await canvasReady(touchPage);
    await openTouch(false); await object(touchPage, 'linked').locator('.content').tap(); await touchPage.waitForURL('**/home'); await canvasReady(touchPage);
    await openTouch(true); await touchPage.waitForSelector('#editor-tools'); await touchPage.locator('#editor-tools summary').tap();
    await touchPage.touchscreen.tap(195, 389); assert.equal(await selected(touchPage), 'line');
    const cdp = await mobile.newCDPSession(touchPage);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 291, y: 389, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 267, y: 413, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const touchLine = await value(touchPage, 'line');
    assert.equal(touchLine.x2, 3); assert.equal(touchLine.y2, -1);
    assert.equal(touchLine.x1, -4); assert.equal(touchLine.y1, -2);
  } finally { await mobile.close(); }
  console.log('Refinements verified: stacking, defaults, focus eligibility, text/image effects, SVG endpoints, line move/delete, touch, and JSON roundtrip.');
};
