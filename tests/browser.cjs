const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const manifest=require('../manifest.json');const base=process.env.SITE_URL||'http://127.0.0.1:5173';
async function run() {
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
 const results=[],errors=[],failures=[];
 async function context(width,touch=false) {
  const ctx=await browser.newContext({viewport:{width,height:900},isMobile:touch,hasTouch:touch,deviceScaleFactor:touch?2:1});const page=await ctx.newPage();
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&m.location().url?.startsWith(base))errors.push(m.text()+' '+m.location().url);});
  page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)failures.push(r.url());});return {ctx,page};
 }
 async function route(page,slug,work=false) {
  const entry=manifest.pages.find(p=>p.slug===slug);await page.goto(`${base}/${work?'work/':''}#/${slug}`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(id=>document.querySelector('.content').dataset.pageId===id,entry.id);
  assert.equal(await page.locator('.doc-header h2').textContent(),entry.title);
 }
 try {
  const {ctx,page}=await context(1440);
  for(const entry of manifest.pages){await route(page,entry.slug);assert.equal(await page.locator('.wip-sticker').isVisible(),entry.status==='wip');assert.ok(!page.url().includes('.md'));}
  results.push('38 public pages, banners/WIP, semantic routes');
  await route(page,'home');
  for(const section of ['projects','notes','archive']){
   await page.locator(`[data-group="${section}"]`).click();
   await page.waitForFunction(key=>activeGroup.key===key&&document.querySelectorAll('.file-link').length===0,section);
   assert.equal(await page.locator(`[data-group="${section}"]`).evaluate(el=>getComputedStyle(el,'::after').content),'" ■"');
  }
  await page.evaluate(()=>localStorage.removeItem('visited:notes-mindfill-my-mother-tongue'));
  await page.locator('[data-group="notes"]').click();await page.waitForFunction(()=>activeGroup.key==='notes');
  await page.locator('[data-group="notes/mindfill"]').click();await page.waitForFunction(()=>document.querySelectorAll('.file-link').length===8);
  assert.equal(await page.locator('[data-group="notes"]').evaluate(el=>getComputedStyle(el,'::after').content),'" •"');
  results.push('Direct leaves only; selected filled square overrides and restores unread dot');
  await route(page,'projects/akashom');assert.equal(await page.locator('.file-link').count(),4);
  await page.locator('.content').evaluate(el=>el.scrollTop=350);
  await route(page,'about');await page.goBack();await page.waitForFunction(()=>document.querySelector('.content').dataset.pageId==='projects-akashom');assert.ok(await page.locator('.content').evaluate(el=>el.scrollTop)>250);
  await page.goto(`${base}/#sciences/akashom/akashom.md`);await page.waitForURL('**/#/projects/akashom');await page.reload();await page.waitForFunction(()=>document.querySelector('.content').dataset.pageId==='projects-akashom');
  // Drag papers apart so both real tuck buttons are exposed.
  await page.waitForFunction(()=>!document.querySelector('#card-files-panel').getAnimations().some(a=>a.playState==='running'));
  for(const kind of ['files','folders']){
   const panel=page.locator(`#card-${kind}-panel`),handle=page.locator(kind==='files'?'.receipt-header':'.card-section-header');
   const before=await panel.boundingBox(),box=await handle.boundingBox();const startX=box.x+(kind==='files'?15:220);await page.mouse.move(startX,box.y+10);await page.mouse.down();await page.mouse.move(startX+(kind==='files'?450:70),box.y+35,{steps:8});await page.mouse.up();await page.waitForFunction(({id,x})=>Math.abs(document.getElementById(id).getBoundingClientRect().x-x)>30,{id:`card-${kind}-panel`,x:before.x});
   await page.locator(`#tuck-${kind}-btn`).click();assert.equal(await panel.getAttribute('data-tucked'),'true');await page.locator(`#tuck-${kind}-btn`).click();assert.equal(await panel.getAttribute('data-tucked'),'false');
  }
  await page.locator('[data-group="notes"]').click();await page.waitForFunction(()=>document.querySelector('#folder-line path'));
  await route(page,'projects/akashom');await page.locator('.content').evaluate(el=>el.scrollTop=el.scrollHeight);await page.locator('#next-page-btn').click();await page.waitForFunction(()=>document.querySelector('.content').dataset.pageId==='projects-akashom-visual-nonvisual-trailer');
  await route(page,'archive/experiments/proof-of-concept');assert.ok(await page.locator('.csv-table tbody tr').count());assert.ok(await page.locator('.multiply-wrapper').count());
  await route(page,'projects/jivan');assert.ok(await page.locator('.html-embed').count());
  await route(page,'projects/darkroom');assert.equal(await page.locator('.content img[loading="lazy"]').count(),41);assert.ok(await page.locator('.full-width-img').count());
  await page.locator('.image-viewer').first().scrollIntoViewIfNeeded();await page.locator('.image-viewer').first().click();await page.waitForSelector('.pswp--open');await page.waitForFunction(()=>viewer.opener.isOpen);await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>viewer.currIndex===1);await page.keyboard.press('ArrowLeft');await page.waitForFunction(()=>viewer.currIndex===0);await page.locator('.pswp__button--zoom').click();await page.keyboard.press('Escape');await page.waitForSelector('.pswp',{state:'detached'});
  assert.ok(await page.evaluate(()=>currentSound?.loop));await page.locator('#mute-btn').click();assert.equal(await page.locator('#mute-btn').getAttribute('aria-pressed'),'true');await page.reload();await page.waitForFunction(()=>document.querySelector('.content').dataset.pageId==='projects-darkroom');assert.equal(await page.locator('#mute-btn').getAttribute('aria-pressed'),'true');assert.ok(await page.evaluate(()=>currentSound.paused));await page.locator('#mute-btn').click();await page.waitForFunction(()=>!currentSound.paused);
  results.push('Desktop drag/tuck/line, next, history/scroll, aliases, embeds, gallery, keyboard viewer, ambient/mute persistence');
  for(const entry of manifest.pages.filter(p=>p.audience.includes('professional'))){await route(page,entry.slug,true);assert.equal(await page.locator('[data-group^="archive"],[data-group="projects/mindscape"],[data-group="projects/darkroom"]').count(),0);const ids=await page.locator('.file-link').evaluateAll(els=>els.map(el=>el.dataset.id));assert.ok(ids.every(id=>manifest.pages.find(p=>p.id===id).audience.includes('professional')));}
  await page.goto(`${base}/work/#/archive/consumption`);await page.waitForFunction(()=>document.querySelector('.content h2')?.textContent==='Page unavailable');
  await page.goto(`${base}/work/index.html#/home`);await page.waitForFunction(()=>document.querySelector('.content').dataset.pageId==='home');assert.equal(await page.locator('[data-group="archive"]').count(),0);
  await ctx.close();
  for(const width of [375,430,768,1366,1920]){
   const touch=width<900,{ctx,page}=await context(width,touch);await route(page,'home');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
   if(touch){
    assert.ok(await page.locator('.content').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))>=16);
    await page.locator('#index-toggle').click();await page.locator('[data-group="notes"]').click();await page.waitForFunction(()=>activeGroup.key==='notes'&&document.querySelectorAll('.file-link').length===0);await page.locator('[data-group="notes/mindfill"]').click();await page.waitForFunction(()=>document.querySelectorAll('.file-link').length===8);await page.locator('.file-link').first().click();await page.waitForFunction(()=>document.querySelector('.content').dataset.pageId==='notes-mindfill');assert.equal(await page.locator('#index-toggle').getAttribute('aria-expanded'),'false');
    await route(page,'projects/darkroom');await page.locator('.image-viewer').first().scrollIntoViewIfNeeded();await page.locator('.image-viewer').first().click();await page.waitForSelector('.pswp--open');await page.waitForFunction(()=>viewer.opener.isOpen);
    const cdp=await ctx.newCDPSession(page);
    async function touchEvent(type,points){await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([x,y,id])=>({x,y,id,radiusX:1,radiusY:1,force:1}))});}
    await touchEvent('touchStart',[[width*.8,400,0]]);for(let i=1;i<=8;i++)await touchEvent('touchMove',[[width*(.8-.65*i/8),400,0]]);await touchEvent('touchEnd',[]);await page.waitForFunction(()=>viewer.currIndex===1);
    const zoom=await page.evaluate(()=>viewer.currSlide.currZoomLevel);
    await touchEvent('touchStart',[[width*.4,400,0],[width*.6,400,1]]);for(let i=1;i<=8;i++)await touchEvent('touchMove',[[width*(.4-.2*i/8),400,0],[width*(.6+.2*i/8),400,1]]);await touchEvent('touchEnd',[]);await page.waitForFunction(z=>viewer.currSlide.currZoomLevel>z,zoom);
    await page.screenshot({path:`/tmp/ux-viewer-${width}.png`});await page.locator('.pswp__button--close').click();await page.waitForSelector('.pswp',{state:'detached'});
   }
   await route(page,'home');await page.screenshot({path:`/tmp/ux-final-${width}.png`});
   const before=await page.evaluate(()=>performance.timeOrigin);await page.setViewportSize({width:width+10,height:920});await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>performance.timeOrigin),before);
   await ctx.close();results.push(`${width}px ${touch?'touch INDEX/swipe/pinch':'desktop'}; no overflow or resize reload`);
  }
  const reduced=await browser.newContext({reducedMotion:'reduce'});const rp=await reduced.newPage();await route(rp,'home');assert.ok(await rp.locator('.card-panel').evaluateAll(els=>els.every(el=>getComputedStyle(el).transitionDuration.split(',').every(value=>parseFloat(value)<0.001))));await reduced.close();
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
  fs.mkdirSync(path.join(__dirname,'../.test-results'),{recursive:true});fs.writeFileSync(path.join(__dirname,'../.test-results/ux-browser.json'),JSON.stringify({results,errors,failures},null,2));console.log(JSON.stringify({results,errors,failures}));
 }catch(error){console.error(error);throw error;}finally{await browser.close();}
}
module.exports=run;if(require.main===module)run().catch(()=>process.exitCode=1);
