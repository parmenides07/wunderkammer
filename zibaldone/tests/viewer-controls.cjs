const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const canvasReady = require('./navigation.cjs');

module.exports = async ({ page, browser, origin, root }) => {
  const text = (id, x, y, extra = {}) => ({ id, type: 'text', x, y, width: 4, height: 3, text: id, font: 'mono', fontSize: 16, ...extra });
  const image = (id, x, y, extra = {}) => ({ id, type: 'image', x, y, width: 4, height: 3, src: '/personal/assets/zion.png', alt: id, ...extra });
  const href = '/personal/#/field-notes';
  const fixture = { slug: 'viewer-controls', camera: { x: 0, y: 0, zoom: 1 }, elements: [
    text('text', -6, -9), image('image', 2, -9),
    text('linked-text', -6, -3, { href }), image('linked-image', 2, -3, { href }),
    text('inert', -6, 3, { maximizable: false, invertOnHover: true }),
    image('tiny', 2, 3, { href, width: 0.5, height: 0.5 }),
  ] };
  await fs.writeFile(path.join(root, 'pages/viewer-controls.json'), JSON.stringify(fixture));
  const open = async (p, edit = false) => {
    await p.goto(origin + '/personal/' + (edit ? '?edit5500' : '') + '#/viewer-controls');
    await canvasReady(p); await p.waitForSelector('[data-id=linked-text]');
  };
  const object = (p, id) => p.locator(`[data-id="${id}"]`);
  const content = (p, id) => object(p, id).locator('.content');
  const arrow = (p, id) => object(p, id).locator('.focus-object');
  const camera = p => p.evaluate(async () => ({ ...(await (await import('/personal/client/main.js')).ready).camera.value }));
  const zoom = (p, value) => p.evaluate(async zoom => (await (await import('/personal/client/main.js')).ready).camera.set({ x: 0, y: 0, zoom }), value);
  const opacity = button => button.evaluate(el => getComputedStyle(el).opacity);
  const near = (a, b) => assert.ok(Math.abs(a - b) < 0.01, `${a} != ${b}`);
  const isOpen = p => p.locator('#focus-view').evaluate(el => el.open);

  await open(page); await page.mouse.move(10, 10);
  for (const id of ['text', 'image']) {
    assert.equal(await arrow(page, id).count(), 0);
    assert.equal(await content(page, id).evaluate(el => getComputedStyle(el).cursor), 'zoom-in');
    await content(page, id).click(); assert.equal(await isOpen(page), true);
    await page.keyboard.press('Escape');
    await content(page, id).focus(); await page.keyboard.press('Enter');
    assert.equal(await isOpen(page), true); await page.keyboard.press('Escape');
  }
  assert.equal(await content(page, 'inert').evaluate(el => getComputedStyle(el).cursor), 'default');
  assert.equal(await arrow(page, 'inert').count(), 0);
  await content(page, 'inert').hover();
  assert.equal(await page.locator('#viewport').getAttribute('data-feedback'), null);
  assert.equal(await arrow(page, 'tiny').isVisible(), false);

  for (const id of ['linked-text', 'linked-image']) {
    await open(page); await page.mouse.move(10, 10);
    assert.equal(await opacity(arrow(page, id)), '0');
    await content(page, id).hover(); assert.equal(await opacity(arrow(page, id)), '1');
    const before = await camera(page);
    await arrow(page, id).click(); assert.equal(await isOpen(page), true);
    assert.match(page.url(), /#\/viewer-controls$/);
    await page.keyboard.press('Escape'); assert.deepEqual(await camera(page), before);
    await page.mouse.move(10, 10); await content(page, id).focus();
    await page.keyboard.press('Tab'); // The separate focus action is the next tab stop.
    assert.equal(await arrow(page, id).evaluate(el => el === document.activeElement), true);
    assert.equal(await opacity(arrow(page, id)), '1');
    await page.keyboard.press('Enter'); assert.equal(await isOpen(page), true);
    await page.keyboard.press('Escape');
    await page.waitForFunction(id => document.activeElement === document.querySelector(`[data-id="${id}"] .focus-object`), id);
    await content(page, id).focus(); await page.keyboard.press('Enter');
    await page.waitForURL('**/field-notes'); await canvasReady(page);
    await open(page); await content(page, id).click();
    await page.waitForURL('**/field-notes'); await canvasReady(page);
  }
  await open(page);
  for (const level of [0.8, 1, 2]) {
    await zoom(page, level); await content(page, 'linked-text').hover();
    const box = await object(page, 'linked-text').boundingBox(), control = await arrow(page, 'linked-text').boundingBox();
    near(control.x, box.x + box.width); near(control.y, box.y);
    near(control.width, 30 * level); near(control.height, 30 * level);
    assert.equal(await arrow(page, 'linked-text').evaluate(el => getComputedStyle(el).transform), 'none');
  }
  await zoom(page, 0.5); assert.equal(await arrow(page, 'linked-text').isVisible(), false);
  await content(page, 'linked-text').focus(); await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.classList.contains('focus-object')), false);
  await zoom(page, 1); assert.equal(await arrow(page, 'linked-text').isVisible(), true);
  await content(page, 'linked-image').hover();
  assert.equal(await object(page, 'linked-image').locator('img').evaluate(el => getComputedStyle(el).transitionTimingFunction), 'ease-out');

  // Viewer arrows do not change the editor's inverse-scaled resize targets.
  await open(page, true); await page.waitForSelector('#editor-tools');
  await content(page, 'linked-text').click();
  const handle = object(page, 'linked-text').locator('[data-handle=both]');
  const originalHandle = await handle.boundingBox();
  await zoom(page, 2); const zoomedHandle = await handle.boundingBox();
  near(zoomedHandle.width, originalHandle.width); near(zoomedHandle.height, originalHandle.height);
  assert.equal(await arrow(page, 'linked-text').isVisible(), false);

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  try {
    const touch = await mobile.newPage(); await open(touch);
    assert.equal(await touch.locator('.focus-object:visible').count(), 2); // Only linked, usable assets.
    for (const id of ['text', 'image']) {
      assert.equal(await arrow(touch, id).count(), 0);
      await content(touch, id).tap(); assert.equal(await isOpen(touch), true);
      await touch.locator('#close-focus').tap();
    }
    for (const id of ['linked-text', 'linked-image']) {
      await open(touch);
      const before = await camera(touch);
      assert.equal(await opacity(arrow(touch, id)), '1');
      assert.ok(await arrow(touch, id).getAttribute('aria-label'));
      await arrow(touch, id).tap(); assert.equal(await isOpen(touch), true);
      assert.match(touch.url(), /#\/viewer-controls$/);
      await touch.locator('#close-focus').tap(); assert.deepEqual(await camera(touch), before);
      await content(touch, id).tap(); await touch.waitForURL('**/field-notes'); await canvasReady(touch);
    }
    await open(touch);
    await zoom(touch, 0.6);
    const box = await object(touch, 'linked-image').boundingBox(), control = await arrow(touch, 'linked-image').boundingBox();
    near(control.width, 24); near(control.x, box.x + box.width); near(control.y, box.y);
    await arrow(touch, 'linked-image').tap(); assert.equal(await isOpen(touch), true);
    await touch.locator('#close-focus').tap();
    await zoom(touch, 0.5); assert.equal(await touch.locator('.focus-object:visible').count(), 0);
    await zoom(touch, 1); await content(touch, 'linked-image').hover();
    assert.deepEqual(await object(touch, 'linked-image').locator('img').evaluate(el => {
      const s = getComputedStyle(el); return [s.transform, s.transitionDuration];
    }), ['none', '0s']);
  } finally { await mobile.close(); }
  console.log('Viewer controls verified: direct focus, linked secondary actions, keyboard/touch, world-scaled arrows, small-target hiding and unchanged editor handles.');
};
