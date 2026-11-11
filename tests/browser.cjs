// Professional regression checks. The independently tested personal viewer lives
// in zibaldone/tests/browser.cjs; the retired receipt-based personal UI is gone.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict'), path = require('node:path'), fs = require('node:fs/promises'), http = require('node:http');
const root = path.resolve(__dirname, '..');
const manifest = require('../manifest.json'), config = require('../site.config.json');
const model = require('../js/content').createContentModel(manifest, 'professional', config);
(async () => {
  let browser, server;
  const errors = [];
  try {
    // Branch Pages excludes authoring source with _config.yml. This server serves
    // only the same public tree and never imports the development server.
    assert.match(await fs.readFile(path.join(root, '_config.yml'), 'utf8'), /^  - zibaldone$/m);
    server = http.createServer(async (req, res) => {
      try {
        const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
        if (/^\/(?:zibaldone|node_modules|tools|tests|_zibaldone)(?:\/|$)/.test(pathname) || pathname.split('/').some(p => p.startsWith('.'))) throw new Error();
        const file = path.join(root, pathname + (pathname.endsWith('/') ? 'index.html' : ''));
        const bytes = await fs.readFile(file);
        res.writeHead(200, { 'Content-Type': ({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.md':'text/plain','.svg':'image/svg+xml','.woff2':'font/woff2','.ttf':'font/ttf','.pdf':'application/pdf'})[path.extname(file)] || 'application/octet-stream' }); res.end(bytes);
      } catch { res.writeHead(404); res.end(); }
    });
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    const base = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, isMobile: width < 900, hasTouch: width < 900 });
      const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
      const open = async slug => { await page.goto(base + '/#/' + slug); await page.waitForFunction(id => document.querySelector('.content')?.dataset.pageId === id, model.resolve(slug).id); };
      for (const entry of model.pages) {
        await open(entry.slug);
        assert.equal(await page.locator('.doc-header h2').textContent(), entry.title);
        assert.equal(await page.locator('#viewport,#editor-tools,#breadcrumbs').count(), 0);
        assert.equal(await page.locator('[data-group="archive"]').count(), 0);
      }
      await open('home'); await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
      await page.screenshot({ path: `/tmp/wunderkammer-professional-${width}.png` });
      if (width < 900) { await page.locator('#index-toggle').click(); await page.locator('#index-close').click(); assert.equal(await page.locator('#index-toggle').getAttribute('aria-expanded'), 'false'); }
      await open('about'); await page.goBack(); await page.waitForFunction(() => document.querySelector('.content')?.dataset.pageId === 'home-professional');
      await page.goForward(); await page.waitForFunction(() => document.querySelector('.content')?.dataset.pageId === 'about-professional');
      await page.goto(base + '/work/index.html#/home'); await page.waitForFunction(() => document.querySelector('.content')?.dataset.pageId === 'home-professional');
      // Old archive URL gets an explanation, never invented canvas content.
      await page.goto(base + '/personal/#/notes/philosophy/maximalist-soul-driver'); await page.waitForSelector('#notice:not([hidden])');
      assert.match(await page.locator('#notice').textContent(), /not been migrated/);
      await page.getByRole('link', { name: 'Open home', exact: true }).click(); await page.waitForSelector('.object');
      assert.equal(new URL(page.url()).hash, '#/home');
      assert.equal(await page.locator('.content-text,.card-panel').count(), 0);
      await page.goto(base + '/personal/?edit5500#/home/art'); await page.waitForSelector('[data-id]');
      assert.deepEqual(await page.locator('#breadcrumbs li > :last-child').allTextContents(), ['home', 'art']);
      await page.reload(); await page.waitForSelector('.object');
      assert.equal(await page.locator('#editor-tools').count(), 0);
      const images = await page.locator('#world img').evaluateAll(nodes => Promise.all(nodes.map(n => n.decode().then(() => n.naturalWidth > 0)))); assert.ok(images.every(Boolean));
      await page.evaluate(() => document.fonts.ready); assert.ok(await page.evaluate(() => document.fonts.check('16px "JetBrains Mono"')));
      await page.screenshot({ path: `/tmp/wunderkammer-personal-${width}.png` });
      await context.close();
    }
    for (const url of ['/personal/client/editor.js','/personal/client/editor.css','/zibaldone/client/editor.js','/_zibaldone/api/publish','/_zibaldone/api/pages']) assert.equal((await fetch(base + url)).status,404);
    assert.deepEqual(errors, []);
    console.log(`Professional regression passed: ${model.pages.length} pages at desktop/mobile, navigation/history, work redirect, isolated personal hash routes, fallback, assets and production exclusion.`);
  } finally { await browser?.close(); if (server) await new Promise(r => server.close(r)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
