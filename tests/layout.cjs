const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.SITE_URL||'http://127.0.0.1:5173';
async function run(){
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});const results=[],errors=[];
 fs.mkdirSync('.test-results/layout',{recursive:true});
 try {for(const width of [375,390,430,768,1440,1920]){
  const touch=width<900,ctx=await browser.newContext({viewport:{width,height:900},hasTouch:touch,isMobile:touch,deviceScaleFactor:1});const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
  async function ready(id){await page.waitForFunction(id=>document.querySelector('.content').dataset.pageId===id,id);await page.evaluate(()=>document.fonts.ready);}
  async function index(){if(touch&&await page.locator('#index-toggle').getAttribute('aria-expanded')==='false')await page.locator('#index-toggle').click();}
  async function group(key){await index();await page.locator(`[data-group="${key}"]`).click();}
  async function header(name){assert.equal(await page.locator('.receipt-header').textContent(),name);}
  await page.goto(base+'/personal/#/home');await ready('home');await page.waitForTimeout(300);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
  const geometry=await page.evaluate(()=>{
   const box=s=>{const e=document.querySelector(s),c=getComputedStyle(e),r=e.getBoundingClientRect();return {width:r.width,height:r.height,font:c.fontSize,line:c.lineHeight,filter:c.filter,background:c.backgroundSize};};
   return {paper:box('.card'),sheet:box('.content-bg'),text:box('.content-text'),article:box('.content'),title:box('.doc-header h2'),heading:box('.content-text > h2'),dates:box('.doc-dates'),receipt:box('.receipt'),grid: getComputedStyle(document.querySelector('.material'),matchMedia('(max-width:900px), (pointer:coarse)').matches?'::before':null).backgroundSize};
  });
  await page.screenshot({path:`.test-results/layout/home-${width}.png`});
  await group('notes');await page.waitForFunction(()=>activeGroup.key==='notes/mindfill'&&document.querySelector('.content').dataset.pageId==='notes-mindfill');
  await header('Mindfill');assert.equal(await page.locator('.file-link').count(),8);
  assert.equal(await page.locator('[data-group="notes/mindfill"]').evaluate(e=>getComputedStyle(e,'::after').content),'" ■"');
  await group('notes/art');await page.waitForFunction(()=>document.querySelector('.file-link.active-link')?.dataset.id===document.querySelector('.content').dataset.pageId&&activeGroup.key==='notes/art');
  await header('Art');assert.equal(await page.locator('.file-link').count(),2);
  const first=await page.locator('.file-link').first().getAttribute('href'),second=await page.locator('.file-link').nth(1).getAttribute('href');assert.ok(page.url().endsWith(first));
  await page.locator('.file-link').nth(1).click();await page.waitForURL('**/'+second);await page.waitForFunction(()=>document.querySelectorAll('.file-link')[1].classList.contains('active-link'));await header('Art');
  await page.goBack();await page.waitForURL('**/'+first);await header('Art');
  await page.goForward();await page.waitForURL('**/'+second);await header('Art');
  await page.reload();await page.waitForFunction(()=>document.querySelectorAll('.file-link')[1]?.classList.contains('active-link'));await header('Art');
  assert.ok(await page.locator('.video').evaluateAll(els=>els.every(el=>el.getBoundingClientRect().width<=document.querySelector('.content-bg').getBoundingClientRect().width)));
  await page.locator('.video').first().scrollIntoViewIfNeeded();await page.screenshot({path:`.test-results/layout/art-${width}.png`});
  await group('projects');await group('projects/akashom');await ready('projects-akashom');await header('Akashom');assert.match(await page.locator('.file-link').first().textContent(),/Overview/);assert.ok(page.url().endsWith('#/projects/akashom'));
  await index();await page.waitForTimeout(300);
  // Texture scale is independent of content height. Rows are integral rule steps.
  const paper=await page.evaluate(()=>{
   const e=document.querySelector('.card'),links=document.querySelector('.card-folder-links');const rule=e.offsetWidth*69/1494;
   const rows=[...e.querySelectorAll('.folder-link')].filter(el=>el.getClientRects().length).map(el=>el.getBoundingClientRect().height);
   const short=links.clientHeight,bg=getComputedStyle(e).backgroundSize;
   for(let i=0;i<40;i++){const a=document.createElement('a');a.className='folder-link';a.textContent='Geometry fixture';links.append(a);}
   return {rule,rows,short,tall:links.clientHeight,overflow:links.scrollHeight>links.clientHeight,unchanged:bg===getComputedStyle(e).backgroundSize};
  });assert.ok(paper.overflow&&paper.unchanged);assert.ok(paper.rows.every(h=>Math.abs(h/paper.rule-1)<.015));
  const receipt=await page.evaluate(()=>{const e=document.querySelector('.receipt'),entries=e.querySelector('.receipt-entries');const bg=getComputedStyle(e).backgroundSize;for(let i=0;i<80;i++){const a=document.createElement('a');a.textContent='Geometry fixture';entries.append(a);}return {overflow:entries.scrollHeight>entries.clientHeight,unchanged:bg===getComputedStyle(e).backgroundSize,height:e.offsetHeight};});assert.ok(receipt.overflow&&receipt.unchanged&&receipt.height<=630);
  // Remove DOM-only fixtures by selecting a real container again.
  await group('notes');await page.waitForFunction(()=>activeGroup.key==='notes/mindfill');await group('notes/mindfill');await page.waitForFunction(()=>activeGroup.key==='notes/mindfill');await page.waitForTimeout(300);await page.screenshot({path:`.test-results/layout/index-${width}.png`});
  if(touch){
   await page.locator('#index-close').click();await page.evaluate(()=>window.scrollTo(0,300));const y=await page.evaluate(()=>window.scrollY);await index();await page.locator('#index-close').click();assert.equal(await page.evaluate(()=>window.scrollY),y);
   const grid=await page.evaluate(()=>{const e=document.querySelector('.material'),before=getComputedStyle(e,'::before');const result={height:before.height,size:before.backgroundSize,position:before.position};const p=document.createElement('div');p.style.height='10000px';document.querySelector('.content-text').append(p);const after=getComputedStyle(e,'::before');result.same=result.height===after.height&&result.size===after.backgroundSize;p.remove();return result;});assert.equal(grid.position,'fixed');assert.ok(grid.same);
  }
  // Existing embeds remain contained inside the narrower sheet.
  for(const slug of ['projects/jivan','archive/experiments/proof-of-concept']){
   await page.goto(base+'/personal/#/'+slug);await page.waitForFunction(()=>document.querySelector('.content').dataset.pageId);
   assert.ok(await page.locator('.content').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
   assert.ok(await page.locator('.content iframe').evaluateAll(els=>els.every(el=>el.getBoundingClientRect().width<=document.querySelector('.content-bg').getBoundingClientRect().width)));
  }
  // Exercise viewer pan and exact scroll restoration, then INDEX after viewer closure.
  await page.goto(base+'/personal/#/projects/darkroom');await ready('projects-darkroom');const image=page.locator('.image-viewer').nth(4);await image.scrollIntoViewIfNeeded();await page.waitForTimeout(150);
  const reading=await page.evaluate(()=>({document:window.scrollY,article:document.querySelector('.content').scrollTop}));await image.click();await page.waitForFunction(()=>viewer?.opener.isOpen);assert.equal(await page.evaluate(()=>document.body.style.overflow),'hidden');
  if(touch){const cdp=await ctx.newCDPSession(page);async function gesture(type,points){await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([x,y,id])=>({x,y,id,radiusX:1,radiusY:1,force:1}))});}
   const start=await page.evaluate(()=>viewer.currIndex);await gesture('touchStart',[[width*.8,400,0]]);for(let i=1;i<=8;i++)await gesture('touchMove',[[width*(.8-.65*i/8),400,0]]);await gesture('touchEnd',[]);await page.waitForFunction(i=>viewer.currIndex===i+1,start);
   const zoom=await page.evaluate(()=>viewer.currSlide.currZoomLevel);await gesture('touchStart',[[width*.4,400,0],[width*.6,400,1]]);for(let i=1;i<=8;i++)await gesture('touchMove',[[width*(.4-.2*i/8),400,0],[width*(.6+.2*i/8),400,1]]);await gesture('touchEnd',[]);await page.waitForFunction(z=>viewer.currSlide.currZoomLevel>z,zoom);await page.waitForTimeout(350);
   const pan=await page.evaluate(()=>({...viewer.currSlide.pan}));await gesture('touchStart',[[width*.5,450,0]]);for(let i=1;i<=8;i++)await gesture('touchMove',[[width*.5+i*5,450+i*6,0]]);await gesture('touchEnd',[]);await page.waitForFunction(p=>viewer.currSlide.pan.x!==p.x||viewer.currSlide.pan.y!==p.y,pan);
  }else{const start=await page.evaluate(()=>viewer.currIndex);await page.keyboard.press('ArrowRight');await page.waitForFunction(i=>viewer.currIndex===i+1,start);await page.locator('.pswp__button--zoom').click();await page.waitForTimeout(400);const pan=await page.evaluate(()=>({...viewer.currSlide.pan}));await page.mouse.move(width/2,450);await page.mouse.down();await page.mouse.move(width/2+90,530,{steps:10});await page.mouse.up();await page.waitForFunction(p=>viewer.currSlide.pan.x!==p.x||viewer.currSlide.pan.y!==p.y,pan);}
  if(touch)await page.locator('.pswp__button--close').click();else await page.keyboard.press('Escape');await page.waitForSelector('.pswp',{state:'detached'});
  const restored=await page.evaluate(()=>({document:window.scrollY,article:document.querySelector('.content').scrollTop}));assert.deepEqual(restored,reading);
  if(touch){await index();await page.locator('#index-close').click();assert.equal(await page.evaluate(()=>window.scrollY),reading.document);}
  results.push({width,geometry,paper,receipt,routes:'A–E pass',viewer:'swipe/arrows, zoom, pan, close, exact scroll restoration pass'});await ctx.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync('.test-results/layout/results.json',JSON.stringify({results,errors},null,2));console.log('PASS layout/routes/viewer geometry at 375, 390, 430, 768, 1440, 1920 px');
 }finally{await browser.close();}
}
module.exports=run;if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});
