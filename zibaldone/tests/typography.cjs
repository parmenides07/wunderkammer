const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const canvasReady = require('./navigation.cjs');
const { renderedFonts } = require('./fonts.cjs');
const settle = p => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const appState = p => p.evaluate(async () => (await (await import('/personal/client/main.js')).ready).page);
const saved = p => p.waitForFunction(() => document.querySelector('#save-status').textContent === 'Saved');

async function loaded(p) {
  await p.evaluate(async () => { await document.fonts.load('18px "Xanh Mono"'); await document.fonts.ready; });
  await settle(p);
}
async function fonts(p) {
  const body = await renderedFonts(p, '[data-id=body] .content');
  assert.ok(body.some(f => f.isCustomFont && f.familyName === 'Xanh Mono' && f.postScriptName === 'XanhMono-Regular'), JSON.stringify(body));
  for (const selector of ['[data-id=annotation] .content', '#breadcrumbs [aria-current=page]']) {
    const used = await renderedFonts(p, selector);
    assert.ok(used.some(f => f.isCustomFont && f.familyName === 'Xanh Mono'), JSON.stringify(used));
  }
  const heading = await renderedFonts(p, '[data-id=heading] .content');
  assert.ok(heading.length && heading.every(f => !/Xanh|Zenbones/.test(f.familyName)), JSON.stringify(heading));
  assert.match(await p.locator('[data-id=heading]').evaluate(n => getComputedStyle(n).fontFamily), /^Baskerville/);
  assert.ok(await p.evaluate(() => !performance.getEntriesByType('resource').some(r => /https:\/\/fonts\.(googleapis|gstatic)\.com/.test(r.name))));
  return { body, heading };
}

module.exports = async ({ page, browser, origin, root }) => {
  const fixture = { slug: 'typography-check', camera: { x: 2, y: 0, zoom: 1 }, elements: [
    { id: 'heading', type: 'text', x: -12, y: -10, width: 26, height: 5, font: 'baskerville', fontSize: 58, lineHeight: 1.1, text: 'Notes from the margins' },
    { id: 'body', type: 'text', x: -12, y: -3, width: 18, height: 10, font: 'xanh', fontSize: 18, lineHeight: 1.4, letterSpacing: 0,
      text: 'An open notebook, somewhere between a reading room and a wall of photographs. A sentence can pause here; another can begin across the white space.\n\nSmall observations: café, Żółć, tiếng Việt. Words keep their own measure, beside an image and a passing technical note.' },
    { id: 'annotation', type: 'text', x: 10, y: -7, width: 12, height: 2, font: 'mono', fontSize: 12, text: 'FIELD NOTE 001\n24px grid / November' },
    { id: 'image', type: 'image', x: 10, y: -3, width: 12, height: 9, src: '/personal/assets/zion.png', alt: 'An existing local image' },
  ] };
  await fs.writeFile(path.join(root, 'pages/typography-check.json'), JSON.stringify(fixture));
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  try {
    for (const [label, p] of [['desktop', page], ['mobile', await mobile.newPage()]]) {
      await p.goto(origin + '/personal/#/typography-check'); await canvasReady(p); await loaded(p);
      const used = await fonts(p);
      console.log(`${label} rendered typography:`, JSON.stringify(used));
      for (const zoom of [0.65, 1, 1.5]) {
        await p.evaluate(async zoom => (await (await import('/personal/client/main.js')).ready).camera.set({ x: -3, y: 0, zoom }), zoom);
        await settle(p); await fonts(p);
        assert.deepEqual(await appState(p), fixture, 'camera zoom never rewrites authored coordinates or typography');
        assert.deepEqual(await p.locator('[data-id=body]').evaluate(n => [n.style.left, n.style.top, n.style.width, n.style.height]), ['-288px', '-72px', '432px', '240px']);
        const metrics = await p.locator('[data-id=body]').evaluate(n => { const s = getComputedStyle(n); return [s.fontSize, s.lineHeight, s.letterSpacing]; });
        assert.deepEqual(metrics, ['18px', '25.2px', 'normal']);
        await p.screenshot({ path: `/tmp/zibaldone-typography-${label}-${zoom}.png` });
      }
      // Long writing stays readable and scrollable in the isolated viewer.
      await p.evaluate(async () => {
        const app = await (await import('/personal/client/main.js')).ready;
        app.focus({ ...app.page.elements[1], text: (app.page.elements[1].text + '\n\n').repeat(30) }, app.nodes.get('body').querySelector('.content'));
      });
      const focus = await p.locator('#focus-content > div').evaluate(n => { const s = getComputedStyle(n); return [s.fontFamily, s.fontSize, s.lineHeight]; });
      assert.match(focus[0], /Xanh Mono/); assert.deepEqual(focus.slice(1), ['18px', '25.2px']);
      assert.ok(await p.locator('#focus-view').evaluate(n => n.scrollHeight > n.clientHeight));
      await p.locator('#close-focus').click();
    }
  } finally { await mobile.close(); }
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(root, 'pages/typography-check.json'), 'utf8')), fixture);

  await page.goto(origin + '/personal/?edit5500#/typography-check'); await canvasReady(page); await page.waitForSelector('#editor-tools');
  await page.locator('#add-text').click(); await page.keyboard.insertText('New writing'); await page.keyboard.press('Escape'); await saved(page);
  const added = (await appState(page)).elements.at(-1);
  assert.deepEqual([added.font, added.fontSize, added.width, added.height], ['xanh', 18, 12, 5]);
  assert.equal(await page.locator('#prop-font option').count(), 3);
  await page.locator(`[data-id="${added.id}"] .content`).click();
  for (const choice of ['baskerville', 'zenbones', 'xanh']) {
    await page.locator('#prop-font').selectOption(choice); await saved(page);
    const current = (await appState(page)).elements.find(e => e.id === added.id);
    assert.deepEqual(current, { ...added, font: choice });
  }
  await page.reload(); await canvasReady(page); await page.waitForSelector('#editor-tools');
  assert.equal((await appState(page)).elements.at(-1).font, 'xanh');

  // Delayed font loading must refresh editor overflow for legacy mono text.
  const late = await browser.newContext();
  try {
    const p = await late.newPage(); let release, requested;
    const gate = new Promise(r => { release = r; }), request = new Promise(r => { requested = r; });
    await fs.writeFile(path.join(root, 'pages/typography-late.json'), JSON.stringify({ ...fixture, slug: 'typography-late', elements: fixture.elements.map(e => e.id === 'body' ? { ...e, font: 'mono', height: 1 } : e) }));
    await p.route('**/assets/Xanh-Mono-Regular-*.woff2', async route => { requested(); await gate; await route.continue(); });
    await p.goto(origin + '/personal/?edit5500#/typography-late', { waitUntil: 'domcontentloaded' }); await canvasReady(p); await p.waitForSelector('#editor-tools');
    await request; await settle(p);
    await p.locator('[data-id=body]').evaluate(n => { n.dataset.overflow = 'waiting-for-font'; });
    release(); await loaded(p);
    await p.waitForFunction(() => document.querySelector('[data-id=body]').dataset.overflow === 'true');
    await saved(p);
    assert.equal((await appState(p)).elements.find(e => e.id === 'body').font, 'mono');
  } finally { await late.close(); }
  console.log('Xanh typography verified: Xanh and Baskerville, new 18px defaults, legacy mono compatibility, late-font overflow, desktop/mobile zoom, focus scrolling, persistence and local-only assets.');
};
module.exports.static = async ({ page, origin, base }) => {
  await page.goto(origin + base + '#/typography-check'); await canvasReady(page); await loaded(page); await fonts(page);
  for (const suffix of ['latin.woff2', 'latin-ext.woff2', 'vietnamese.woff2'])
    assert.equal((await page.request.get(origin + base + 'assets/Xanh-Mono-Regular-' + suffix)).status(), 200);
  assert.equal((await page.request.get(origin + base + 'assets/Xanh-Mono-OFL.txt')).status(), 200);
  assert.equal(await page.locator('#editor-tools').count(), 0);
};
