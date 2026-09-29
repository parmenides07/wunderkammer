// Optional browser regression runner: PLAYWRIGHT_MODULE=/path/to/playwright node tests/browser.cjs
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const manifest = require('../manifest.json');
const base = process.env.SITE_URL || 'http://127.0.0.1:5173';
module.exports = async function runBrowserChecks() {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [], localFailures = [], consoleErrors = [], checks = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if(message.type()==='error') consoleErrors.push({text:message.text(),url:message.location().url}); });
  page.on('response', response => { if (response.url().startsWith(base) && response.status() >= 400) localFailures.push(`${response.status()} ${response.url()}`); });
  async function route(slug, mode = '') {
    const url = `${base}/${mode}#/${slug}`;
    await page.goto(url, {waitUntil:'domcontentloaded'});
    const expected = manifest.pages.find(p => p.slug === slug);
    await page.waitForFunction(id => document.querySelector('.content').dataset.pageId === id, expected.id);
    if (await page.locator('#info-card').isVisible()) {
      await page.waitForFunction(()=>getComputedStyle(document.getElementById('info-card')).opacity==='1');
      await page.locator('#info-card').click({position:{x:5,y:5}});
    }
    await page.waitForFunction(() => !document.getElementById('info-card').classList.contains('active'));
    assert.equal(await page.locator('.doc-header h2').textContent(), expected.title);
    assert.ok(!page.url().includes('.md'));
    const broken = await page.locator('.content img, .banner[src]').evaluateAll(async images => {
      await Promise.all(images.map(img => img.complete ? null : new Promise(resolve => { img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true}); })));
      return images.filter(img=>!img.naturalWidth).map(img=>img.src);
    });
    assert.deepEqual(broken,[],slug);
    assert.equal(await page.locator('.wip-sticker').isVisible(), expected.status === 'wip');
    assert.equal(await page.locator('.banner').isVisible(), !!expected.banner);
    const stored = await page.evaluate(id => localStorage.getItem(`visited:${id}`),expected.id);
    assert.ok(Number(stored)>0);
    assert.equal(await page.locator('.file-link.active-link.unread').count(),0);
    checks.push(`${mode || 'public/'}${slug}`);
  }
  try {
    for (const entry of manifest.pages) await route(entry.slug);
    console.log(`Verified ${manifest.pages.length} public pages and all rendered image requests`);
    // Gallery flags, lightbox, audio and the unchanged paper interactions.
    await route('projects/darkroom');
    assert.ok(await page.locator('.content .full-width-img').count()>0);
    const galleryCount = await page.locator('.content img').count();
    assert.ok(galleryCount>20);
    await page.locator('.content img').first().click({force:true});
    assert.ok(await page.locator('#lightbox.active').count());
    await page.locator('#lightbox-img').click();
    assert.equal(await page.locator('#lightbox.active').count(),0);
    assert.ok(await page.evaluate(()=>currentSound.src.includes('vanished.mp3') && currentSound.loop));
    await page.locator('#mute-btn').click({force:true});
    assert.ok(await page.evaluate(()=>siteMuted && currentSound.paused));
    await page.locator('#mute-btn').click({force:true});
    await page.waitForFunction(()=>!siteMuted && !currentSound.paused);
    for (const kind of ['files','folders']) {
      const panel=page.locator(`#card-${kind}-panel`), handle=page.locator(kind==='folders'?'.card-section-header':'.receipt-header');
      const before=await panel.boundingBox(), rect=await handle.boundingBox();
      await page.mouse.move(rect.x+15,rect.y+10);await page.mouse.down();await page.mouse.move(rect.x+(kind==='files'?515:85),rect.y+40,{steps:6});await page.mouse.up();
      const after=await panel.boundingBox();assert.ok(Math.abs(after.x-before.x)>20,`${kind} drag`);
      await page.locator(`#tuck-${kind}-btn`).click();assert.equal(await panel.getAttribute('data-tucked'),'true');
      await page.locator(`#tuck-${kind}-btn`).click();assert.equal(await panel.getAttribute('data-tucked'),'false');
    }
    if (await page.locator('[data-group="notes"].open').count()) await page.locator('[data-group="notes"]').click();
    await page.locator('[data-group="notes"]').click();
    await page.waitForFunction(()=>document.querySelector('#folder-line path')!==null);
    await page.locator('[data-group="notes/mindfill"]').click();
    await page.waitForFunction(()=>document.querySelector('.content').dataset.pageId==='notes-mindfill');
    await page.locator('#next-page-btn').evaluate(el=>el.click());
    await page.waitForFunction(()=>location.hash!=='#/notes/mindfill' && document.querySelector('.content').dataset.pageId!=='notes-mindfill');
    await route('archive/experiments/proof-of-concept');
    assert.ok(await page.locator('.csv-table tbody tr').count()>0);
    assert.ok(await page.locator('.multiply-wrapper img').count()>0);
    await route('projects/mindscape/examples/praferin');
    assert.ok(await page.locator('iframe.html-embed').count()>0);
    assert.ok((await page.locator('iframe.html-embed').getAttribute('src')).includes('/projects/mindscape/examples/prayfor.html'));
    await route('archive/music/currents');
    const soundImage=page.locator('.content img[style*="pointer"]').first();
    await soundImage.dispatchEvent('mousedown',{button:2});
    await page.waitForFunction(()=>currentSound && !currentSound.paused);
    // Public aliases normalize, and refresh/back/forward preserve semantic routing.
    await page.goto(`${base}/#sciences/akashom/akashom.md`,{waitUntil:'domcontentloaded'});
    await page.waitForURL('**/#/projects/akashom');
    await page.waitForFunction(()=>document.querySelector('.content').dataset.pageId==='projects-akashom');
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.querySelector('.content').dataset.pageId==='projects-akashom');
    await page.evaluate(()=>{location.hash='#/projects/akashom/architecture';});
    await page.waitForFunction(()=>document.querySelector('.content').dataset.pageId==='projects-akashom-architecture');
    await page.goBack();await page.waitForFunction(()=>document.querySelector('.content').dataset.pageId==='projects-akashom');
    await page.goForward();await page.waitForFunction(()=>document.querySelector('.content').dataset.pageId==='projects-akashom-architecture');
    // Every professional page, all receipt lists, and next traversal are filtered.
    for (const entry of manifest.pages.filter(p=>p.audience.includes('professional'))) {
      await route(entry.slug,'work/');
      const ids=await page.locator('.file-link').evaluateAll(links=>links.map(link=>link.dataset.id));
      assert.ok(ids.every(id=>manifest.pages.find(p=>p.id===id).audience.includes('professional')));
      assert.equal(await page.locator('[data-group^="archive"], [data-group="projects/mindscape"], [data-group="projects/darkroom"]').count(),0);
    }
    await route('projects/akashom','work/');
    const seen=[];
    for(let i=0;i<12;i++){
      const id=await page.locator('.content').getAttribute('data-page-id');seen.push(id);
      assert.ok(manifest.pages.find(p=>p.id===id).audience.includes('professional'));
      if(!await page.locator('#next-page-btn').isVisible())break;
      await page.locator('#next-page-btn').evaluate(el=>el.click());
      await page.waitForFunction(old=>document.querySelector('.content').dataset.pageId!==old,id);
    }
    assert.equal(seen.length,4);
    await page.goto(`${base}/work/#arts/prose/pm_02/projectMindscape.md`,{waitUntil:'domcontentloaded'});
    await page.waitForSelector('.content h2');
    assert.equal(await page.locator('.content h2').textContent(),'Page unavailable');
    assert.equal(await page.locator('#next-page-btn').isVisible(),false);
    await route('home','work/');
    const request=await context.request.get(`${base}/work/`);assert.ok(request.ok());
    await page.screenshot({path:'/tmp/site-work-final.png'});
    await page.goto(`${base}/work/index.html#/home`,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.querySelector('.content').dataset.pageId==='home');
    assert.equal(await page.locator('[data-group="archive"]').count(),0);
    await route('projects/akashom');await page.screenshot({path:'/tmp/site-public-final.png'});
    // The original stylesheet references a font absent from the original repository.
    assert.deepEqual(localFailures.filter(failure=>!failure.endsWith('/assets/Baskerville.woff2')),[]);
    assert.deepEqual(errors,[]);
    fs.mkdirSync(path.join(__dirname,'../.test-results'),{recursive:true});
    fs.writeFileSync(path.join(__dirname,'../.test-results/browser.json'),JSON.stringify({checks,galleryCount,errors,localFailures,consoleErrors,passed:true},null,2));
    console.log(JSON.stringify({pages:checks.length,galleryCount,errors,localFailures,consoleErrorCount:consoleErrors.length,passed:true}));
  } catch(error) { await page.screenshot({path:'/tmp/site-browser-failure.png'}); throw error; } finally { await browser.close(); }
};
if(require.main===module)module.exports().catch(e=>{console.error(e);process.exitCode=1;});
