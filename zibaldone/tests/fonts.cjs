const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const canvasReady = require('./navigation.cjs');
const settle = p => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

async function renderedFonts(p, selector) {
  const session = await p.context().newCDPSession(p);
  try {
    await session.send('DOM.enable'); await session.send('CSS.enable');
    const { root } = await session.send('DOM.getDocument');
    const { nodeId } = await session.send('DOM.querySelector', { nodeId: root.nodeId, selector });
    assert.ok(nodeId, selector);
    const { fonts } = await session.send('CSS.getPlatformFontsForNode', { nodeId });
    return fonts.filter(font => font.glyphCount > 0);
  } finally { await session.detach(); }
}
async function verifyRendered(p, selector) {
  const fonts = await renderedFonts(p, selector);
  assert.ok(fonts.some(f => f.isCustomFont && f.familyName === 'Zenbones Mono' && f.postScriptName === 'Zenbones-Mono'),
    `${selector} must draw real Zenbones Mono glyphs: ${JSON.stringify(fonts)}`);
  assert.ok(fonts.every(f => !/JetBrains|Brainy|Prose|Proto|Slab/.test(f.familyName)), JSON.stringify(fonts));
}

async function verify(p, base = '/personal/') {
  await p.evaluate(async () => {
    await document.fonts.load('16px "Zenbones Mono"'); await document.fonts.ready;
  });
  await settle(p);
  assert.ok(await p.evaluate(() => [...document.fonts].some(f => f.family.replaceAll(/["']/g, '') === 'Zenbones Mono' && f.status === 'loaded')));
  await verifyRendered(p, '[data-id=mono] .content');
  await verifyRendered(p, '#breadcrumbs [aria-current=page]');
  if (await p.locator('#editor-tools').count()) await verifyRendered(p, '#save-page');
  assert.equal((await p.request.get(new URL(base + 'assets/Zenbones-Mono-Regular.woff2', p.url()).href)).status(), 200);
  assert.ok(await p.evaluate(() => !performance.getEntriesByType('resource').some(r => /jetbrains-mono\.(ttf|woff2)/i.test(r.name))), 'no stale JetBrains webfont is requested');
  const measured = await p.evaluate(async base => {
    const app = await (await import(base + 'client/main.js')).ready;
    const node = app.nodes.get('mono'), content = node.querySelector('.content'), style = getComputedStyle(node);
    const rect = content.getBoundingClientRect(), origin = app.world.getBoundingClientRect();
    return { family: style.fontFamily, ui: getComputedStyle(document.querySelector('#breadcrumbs')).fontFamily,
      width: node.clientWidth, height: node.clientHeight, overflow: content.scrollHeight > node.clientHeight,
      lineHeight: style.lineHeight, spacing: style.letterSpacing, size: style.fontSize,
      bottom: (rect.bottom - origin.top) / (24 * app.camera.value.zoom), bounds: app.bounds, page: app.page };
  }, base);
  assert.match(measured.family, /Zenbones Mono/); assert.match(measured.ui, /Zenbones Mono/);
  assert.equal(measured.width, 144); assert.equal(measured.height, 24); assert.ok(measured.overflow);
  assert.equal(measured.size, '16px'); assert.equal(measured.lineHeight, '20px'); assert.equal(measured.spacing, '0.8px');
  if (measured.bounds) assert.ok(measured.bounds.maxY >= measured.bottom, 'font-driven text overflow remains inside measured bounds');
  return measured.page;
}

module.exports = async ({ page, origin, root, browser }) => {
  const fixture = { slug: 'font-check', camera: { x: 0, y: 0, zoom: 1 }, elements: [
    { id: 'mono', type: 'text', x: -10, y: -6, width: 6, height: 1, text: 'A line of spatial writing with words that must wrap.\n'.repeat(6), font: 'mono', fontSize: 16, lineHeight: 1.25, letterSpacing: 0.05 },
    { id: 'serif', type: 'text', x: 5, y: -6, width: 6, height: 2, text: 'Baskerville remains.', font: 'baskerville', fontSize: 20 },
  ] };
  await fs.writeFile(path.join(root, 'pages/font-check.json'), JSON.stringify(fixture));
  // A fresh context and delayed font exercise fallback-to-webfont measurement.
  const context = await browser.newContext();
  try {
    const delayed = await context.newPage(); let release, requested;
    const pending = new Promise(r => { release = r; }), request = new Promise(r => { requested = r; });
    await delayed.route('**/assets/Zenbones-Mono-Regular.woff2', async route => { requested(); await pending; await route.continue(); });
    await delayed.goto(origin + '/personal/#/font-check', { waitUntil: 'domcontentloaded' });
    await canvasReady(delayed); await request;
    assert.ok(!(await renderedFonts(delayed, '[data-id=mono] .content')).some(f => f.isCustomFont), 'pending font uses a fallback, then swaps to the actual webfont');
    await delayed.evaluate(async () => {
      const app = await (await import('/personal/client/main.js')).ready, measure = app.measureBounds.bind(app);
      window.fontMeasures = 0; app.measureBounds = () => { window.fontMeasures++; return measure(); };
    });
    release(); await verify(delayed);
    assert.ok(await delayed.evaluate(() => window.fontMeasures > 0), 'font completion refreshes the cached bounds');
  } finally { await context.close(); }
  await page.goto(origin + '/personal/#/font-check'); await canvasReady(page); await verify(page);
  await page.locator('[data-id=mono] .content').click();
  assert.match(await page.locator('.focus-text').evaluate(n => getComputedStyle(n).fontFamily), /Zenbones Mono/);
  assert.equal(await page.locator('.focus-text').textContent(), fixture.elements[0].text);
  await page.keyboard.press('Escape');
  await page.goto(origin + '/personal/?edit5500#/font-check'); await canvasReady(page); await page.waitForSelector('#editor-tools');
  const saved = await verify(page); assert.equal(saved.elements[0].font, 'mono');
  await page.waitForFunction(() => document.querySelector('[data-id=mono]').dataset.overflow === 'true');
  assert.deepEqual(await page.locator('#prop-font option').allTextContents(), ['Xanh Mono', 'Baskerville', 'Zenbones Mono']);
  assert.match(await page.locator('[data-id=serif]').evaluate(n => getComputedStyle(n).fontFamily), /Baskerville/);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(root, 'pages/font-check.json'), 'utf8')), fixture);
  console.log('Zenbones verified: Chromium draws Zenbones Mono / Zenbones-Mono custom glyphs in viewer, editor and breadcrumbs; WOFF2 URLs, fallback/swap, bounds, wrapping/overflow, unchanged box metrics/schema, focus and Baskerville checked.');
};
module.exports.static = async ({ page, origin, base }) => {
  await page.goto(origin + base + '#/font-check'); await canvasReady(page); await verify(page, base);
  assert.equal((await page.request.get(origin + base + 'assets/Zenbones-Mono-LICENSE.md')).status(), 200);
};
module.exports.renderedFonts = renderedFonts;
