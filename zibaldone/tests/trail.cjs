const canvasReady = require('./navigation.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const labels = page => page.locator('#breadcrumbs li > :last-child').allTextContents();
const ready = async page => { await canvasReady(page); await page.waitForSelector('.object'); await page.evaluate(() => document.fonts.ready); };
const content = (page, id) => page.locator(`[data-id="${id}"] > .content`);
const follow = async (page, id) => { await content(page, id).click(); await ready(page); };
const camera = page => page.evaluate(async () => {
  const app = await (await import(document.documentElement.dataset.spaceBase + 'client/main.js')).ready;
  return app.camera.value;
});
const expect = async (page, trail) => {
  await page.waitForFunction(expected => JSON.stringify([...document.querySelectorAll('#breadcrumbs li > :last-child')].map(n => n.textContent)) === JSON.stringify(expected), trail);
  assert.deepEqual(await labels(page), trail);
  assert.equal(await page.locator('#breadcrumbs [aria-current=page]').count(), 1);
  assert.equal(await page.locator('#breadcrumbs a').count(), trail.length - 1);
};
const text = (id, text, x, y, href) => ({ id, type: 'text', x, y, width: 8, height: 2, text, font: 'mono', fontSize: 16, ...(href ? { href } : {}) });

module.exports.local = async ({ browser, origin, root }) => {
  const homePath = path.join(root, 'pages/home.json'), originalHome = await fs.readFile(homePath);
  const home = JSON.parse(originalHome);
  home.elements.push(text('trail-art', 'art', -16, -5, '/space/art/'));
  await fs.writeFile(homePath, JSON.stringify(home));
  const longSlugs = ['another-small-experiment', 'observations-from-november', 'images-from-a-walk', 'fragments-and-memories'];
  const slugs = ['art', 'comics', 'photography', ...longSlugs];
  for (const [index, slug] of slugs.entries()) {
    const page = { slug, camera: { x: 0, y: 0, zoom: 1 }, elements: [
      text('next', 'next', -4, -5, `/space/${slugs[(index + 1) % slugs.length]}/`),
      text('to-art', 'art', -4, -2, '/space/art/'),
      text('to-home', 'home', -4, 1, '/space/'),
      text('isolate', 'alone', 5, -2),
      text('to-photo', 'photography', 5, -5, '/space/photography/'),
      text('external', 'external', 5, 1, 'https://outside.invalid/'),
    ], ...(slug === 'comics' ? { title: 'Comic Studies' } : {}) };
    await fs.writeFile(path.join(root, 'pages', slug + '.json'), JSON.stringify(page));
  }
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto(origin + '/personal/'); await canvasReady(page); await ready(page); await expect(page, ['home']);
    await follow(page, 'trail-art'); await expect(page, ['home', 'art']);
    await follow(page, 'next'); await expect(page, ['home', 'art', 'comic studies']);
    await page.reload(); await ready(page); await expect(page, ['home', 'art', 'comic studies']);
    await page.goBack(); await ready(page); await expect(page, ['home', 'art']);
    await page.goForward(); await ready(page); await expect(page, ['home', 'art', 'comic studies']);
    const art = page.locator('#breadcrumbs a').filter({ hasText: /^art$/ });
    await art.hover(); assert.equal(await art.evaluate(n => getComputedStyle(n).color), 'rgb(163, 58, 50)');
    assert.equal(await page.locator('#viewport').getAttribute('data-feedback'), null);
    await page.mouse.move(1000, 20); await art.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
    assert.equal(await art.evaluate(n => getComputedStyle(n).color), 'rgb(163, 58, 50)');
    await page.keyboard.press('Enter'); await ready(page); await expect(page, ['home', 'art']);
    // The new branch drops comics; ordinary object links also prune earlier visits.
    await follow(page, 'to-photo'); await expect(page, ['home', 'art', 'photography']);
    await page.locator('#breadcrumbs a').filter({ hasText: /^art$/ }).click(); await ready(page);
    await page.goBack(); await ready(page); await expect(page, ['home', 'art', 'photography']);
    await follow(page, 'to-art'); await expect(page, ['home', 'art']);
    await follow(page, 'to-home'); await expect(page, ['home']);
    await follow(page, 'trail-art'); await follow(page, 'next');

    const fresh = await context.newPage();
    await fresh.goto(origin + '/personal/#/comics'); await canvasReady(fresh); await ready(fresh); await expect(fresh, ['comic studies']);
    await fresh.goto(origin + '/personal/#/home/art/comics'); await canvasReady(fresh); await expect(fresh, ['home', 'art', 'comic studies']); await fresh.close();
    const popupPromise = page.waitForEvent('popup');
    await page.evaluate(() => window.open('/personal/#/art'));
    const popup = await popupPromise; await ready(popup); await expect(popup, ['art']);
    await follow(popup, 'next'); await expect(popup, ['art', 'comic studies']); await popup.close();
    await expect(page, ['home', 'art', 'comic studies']);
    const modifiedPromise = context.waitForEvent('page');
    await page.locator('#breadcrumbs a').last().click({ modifiers: ['Control'] });
    const modified = await modifiedPromise; await ready(modified); await expect(modified, ['home', 'art']); await modified.close();
    await expect(page, ['home', 'art', 'comic studies']);

    await context.route('https://outside.invalid/**', route => route.fulfill({ contentType: 'text/html', body: '<p>outside</p>' }));
    await content(page, 'external').click(); await page.waitForURL('https://outside.invalid/');
    await page.goBack(); await ready(page); await expect(page, ['home', 'art', 'comic studies']);
    await page.mouse.move(1050, 650); await page.keyboard.down('Space'); await page.mouse.down();
    await page.mouse.move(1074, 674); await page.mouse.up(); await page.keyboard.up('Space');
    const beforeFocus = await camera(page), bar = await page.locator('#breadcrumbs').boundingBox();
    await page.waitForTimeout(400); await content(page, 'isolate').click();
    assert.equal(await page.locator('#breadcrumbs').isVisible(), false);
    await page.keyboard.press('Escape'); await expect(page, ['home', 'art', 'comic studies']);
    assert.deepEqual(await camera(page), beforeFocus); assert.deepEqual(await page.locator('#breadcrumbs').boundingBox(), bar);

    // Editor page picker keeps the same trail and edit URLs. Native beforeunload
    // cancels navigation without pruning the active entry or writing a handoff.
    await page.goto(origin + '/personal/?edit5500'); await canvasReady(page); await page.waitForSelector('#editor-tools');
    await page.locator('#page-picker').selectOption('art'); await page.waitForURL('**/art'); await canvasReady(page); await page.waitForSelector('#editor-tools');
    await page.locator('#page-picker').selectOption('comics'); await page.waitForURL('**/comics'); await canvasReady(page); await page.waitForSelector('#editor-tools');
    await expect(page, ['home', 'art', 'comic studies']);
    assert.ok((await page.locator('#editor-tools').boundingBox()).y >= 30);
    await page.route('**/_zibaldone/api/pages/comics', route => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Disk unavailable' }) }));
    await content(page, 'isolate').dblclick(); await page.keyboard.insertText(' unsaved'); await page.keyboard.press('Escape');
    let prompts = 0;
    const reject = async dialog => { assert.equal(dialog.type(), 'confirm'); prompts++; await dialog.dismiss(); };
    page.on('dialog', reject);
    await content(page, 'isolate').click();
    await page.locator('#breadcrumbs a').filter({ hasText: /^art$/ }).focus();
    const count = await page.locator('.object').count();
    const position = await page.locator('[data-id=isolate]').getAttribute('style');
    await page.keyboard.press('Delete'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Space');
    assert.equal(await page.locator('.object').count(), count);
    assert.equal(await page.locator('[data-id=isolate]').getAttribute('style'), position);
    assert.equal(await page.locator('.pan-ready').count(), 0);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('#save-status').textContent === 'Save failed'); assert.equal(prompts, 0);
    assert.ok(page.url().endsWith('/comics')); await expect(page, ['home', 'art', 'comic studies']);
    assert.match(await content(page, 'isolate').textContent(), /unsaved/);
    assert.equal(await page.evaluate(() => sessionStorage.getItem('zibaldoneTrail:/personal/:pending')), null);
    await page.goBack();
    await page.waitForFunction(() => location.hash === '#/home/art/comics'); await expect(page, ['home', 'art', 'comic studies']);
    assert.equal(prompts, 0); assert.match(await content(page, 'isolate').textContent(), /unsaved/);
    page.off('dialog', reject);
    await page.unroute('**/_zibaldone/api/pages/comics');
    await page.locator('#breadcrumbs a').filter({ hasText: /^art$/ }).click(); await page.waitForURL('**/art'); await canvasReady(page);
    await page.waitForSelector('#editor-tools'); await expect(page, ['home', 'art']);
    assert.deepEqual(errors, []);
  } finally { await context.close(); await fs.writeFile(homePath, originalHome); }

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  try {
    const page = await mobile.newPage(); await page.goto(origin + '/personal/#/art'); await canvasReady(page); await ready(page);
    for (let i = 0; i < slugs.length - 1; i++) await follow(page, 'next');
    const metrics = await page.locator('#breadcrumbs').evaluate(n => ({ height: n.clientHeight, width: n.clientWidth, scroll: n.scrollWidth, y: n.getBoundingClientRect().y }));
    assert.equal(metrics.height, 30); assert.equal(metrics.y, 0); assert.ok(metrics.scroll > metrics.width);
    assert.equal((await page.locator('#viewport').boundingBox()).y, 30);
    const before = await camera(page), cdp = await mobile.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 50, y: 15, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 300, y: 15, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert.deepEqual(await camera(page), before);
    await page.locator('#breadcrumbs').evaluate(n => { n.scrollLeft = 0; });
    await page.screenshot({ path: '/tmp/zibaldone-trail-mobile.png' });
    await page.locator('#breadcrumbs a').first().tap(); await ready(page); await expect(page, ['art']);
  } finally { await mobile.close(); }
  console.log('Breadcrumbs verified: visited path/pruning, refresh/history, independent tabs, external links, focus, unsaved editor protection and mobile scrolling.');
};

module.exports.static = async ({ browser, origin, base }) => {
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  try {
    const page = await context.newPage(); await page.goto(origin + base + '?edit5500#/art'); await canvasReady(page); await ready(page); await expect(page, ['art']);
    assert.equal(await page.locator('#editor-tools').count(), 0);
    await follow(page, 'next'); await expect(page, ['art', 'comic studies']);
    await page.screenshot({ path: '/tmp/zibaldone-trail-static.png' });
    assert.equal(await page.locator('#breadcrumbs a').getAttribute('href'), base + '#/art');
    await page.reload(); await ready(page); await expect(page, ['art', 'comic studies']);
    await page.locator('#breadcrumbs a').click(); await ready(page); await expect(page, ['art']);
    await page.goBack(); await ready(page); await expect(page, ['art', 'comic studies']);
    await page.goForward(); await ready(page); await expect(page, ['art']);
  } finally { await context.close(); }
};
