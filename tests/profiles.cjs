const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.SITE_URL||'http://127.0.0.1:5173';
async function run(){const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});const results=[],errors=[];fs.mkdirSync('.test-results/profiles',{recursive:true});
try {for(const width of [375,390,430,768,1440,1920]){
 const mobile=width<900,ctx=await browser.newContext({viewport:{width,height:900},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1}),page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
 async function ready(id){await page.waitForFunction(id=>document.querySelector('.content').dataset.pageId===id,id);}
 async function index(){if(mobile&&await page.locator('#index-toggle').getAttribute('aria-expanded')==='false')await page.locator('#index-toggle').click();}
 async function close(){if(mobile&&await page.locator('#index-toggle').getAttribute('aria-expanded')==='true')await page.locator('#index-close').click();}
 async function select(key){await index();await page.locator(`[data-group="${key}"]`).click();await page.waitForFunction(key=>activeGroup.key===key,key);}
 async function shot(name){await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(250);await page.screenshot({path:`.test-results/profiles/${name}-${width}.png`});}
 await page.goto(base+'/personal/#/home');await ready('home');await shot('home');
 const ink=await page.locator('.content p').first().evaluate(e=>getComputedStyle(e).filter);if(!mobile)assert.ok(ink.includes('blur('));if(mobile)assert.equal(ink,'none');
 else assert.equal(ink,width===1440?'blur(0.1008px) drop-shadow(rgba(0, 0, 0, 0.19) 0px 0px 2.88px)':'blur(0.1232px) drop-shadow(rgba(0, 0, 0, 0.19) 0px 0px 3.52px)');
 await page.evaluate(()=>{window.bobs=0;document.getElementById('card-files-panel').addEventListener('animationstart',e=>{if(e.animationName==='receiptBob')window.bobs++;});});
 await select('projects');await select('projects/darkroom');await ready('projects-darkroom');assert.ok(await page.locator('.content').evaluate(e=>e.classList.contains('layout-gallery')));assert.equal(await page.evaluate(()=>receiptState.receiptTucked),true);
 assert.equal(await page.locator('[data-group="projects/darkroom"]').evaluate(e=>getComputedStyle(e,'::before').content),'none');
 assert.equal(await page.locator('[data-group="projects"]').getAttribute('aria-expanded'),'true');
 const row=await page.locator('[data-group="projects/darkroom"]').boundingBox(),paper=await page.locator('.card').boundingBox();assert.ok(Math.abs(row.height-paper.width*69/1494)<.1);
 assert.equal(await page.evaluate(()=>window.bobs),0);await shot('darkroom-index');await close();
 const columns=await page.locator('.content .grid').first().evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length);assert.equal(columns,width<=600?1:2);
 await page.locator('.content .grid').first().scrollIntoViewIfNeeded();await shot('gallery');await page.locator('.image-viewer').first().click();await page.waitForFunction(()=>viewer?.opener.isOpen);await page.keyboard.press('Escape');await page.waitForSelector('.pswp',{state:'detached'});
 await select('projects/akashom');await ready('projects-akashom');await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>receiptState.receiptTucked),false);assert.equal(await page.locator('.receipt-header').textContent(),'Akashom');assert.equal(await page.evaluate(()=>window.bobs),0);assert.equal(await page.locator('#folder-line path').count(),mobile?0:2);await shot('akashom-index');
 const before=await page.evaluate(()=>window.bobs);await page.locator('.file-link').nth(1).click();await ready('projects-akashom-visual-nonvisual-trailer');assert.equal(await page.evaluate(()=>window.bobs),before);
 await index();if(!mobile)await page.locator('#tuck-files-btn').click();assert.equal(await page.evaluate(()=>receiptState.receiptTucked),!mobile);await page.evaluate(()=>location.hash='#/projects/akashom/architecture');await ready('projects-akashom-architecture');assert.equal(await page.evaluate(()=>receiptState.receiptTucked),!mobile);assert.equal(await page.locator('#folder-line path').count(),0);
 await select('notes');assert.equal(await page.locator('[data-group="projects"]').getAttribute('aria-expanded'),'false');assert.equal(await page.locator('.file-link').count(),0);assert.equal(await page.locator('#card-files-panel').getAttribute('hidden'),null);
 await select('notes/mindfill');await ready('notes-mindfill');assert.equal(await page.locator('.collection-index a').count(),7);assert.equal(await page.evaluate(()=>receiptState.receiptTucked),false);await shot('mindfill-index');await close();await shot('mindfill');
 const dates=await page.locator('.collection-index time').allTextContents();assert.deepEqual(dates,dates.slice().sort().reverse());
 await page.locator('.collection-index a').first().click();await page.waitForFunction(()=>document.querySelector('.content').classList.contains('layout-essay'));assert.equal(await page.locator('.receipt-header').textContent(),'Mindfill');
 await page.goBack();await ready('notes-mindfill');assert.equal(await page.evaluate(()=>receiptState.receiptTucked),false);assert.deepEqual(await page.evaluate(()=>[...expandedGroups]),['notes']);
 // Desktop papers intentionally overlap; the index receipt now stays open by rule.
 if(!mobile)await page.locator('#tuck-files-btn').click();
 await select('notes/philosophy');await ready('notes-philosophy');await close();assert.equal(await page.locator('.collection-index a').count(),1);await shot('philosophy');
 await page.evaluate(async()=>{contentModel.byId.get('notes-philosophy-maximalist-soul-driver').status='superseded';await renderPage(contentModel.byId.get('notes-philosophy'));});assert.equal(await page.locator('.entry-status').textContent(),'superseded');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
 if(mobile){await page.evaluate(()=>window.scrollTo(0,300));const y=await page.evaluate(()=>window.scrollY);await index();await close();assert.equal(await page.evaluate(()=>window.scrollY),y);}
 results.push({width,ink,row:row.height,rule:paper.width*69/1494,galleryColumns:columns,scenarios:'A–F pass'});await ctx.close();
 }
 // Browser fixtures exercise future groups without adding a project to authored content.
 const ctx=await browser.newContext(),page=await ctx.newPage();const manifest=JSON.parse(fs.readFileSync('manifest.json')),config=JSON.parse(fs.readFileSync('site.config.json'));
 config.groups=[{id:'experiments',label:'Experiments',parent:'projects/akashom'},{id:'hardware',label:'Hardware',parent:'projects/akashom'}];
 for(const p of manifest.pages){if(p.id==='projects-akashom-architecture')p.parent='hardware';if(['projects-akashom-visual-design','projects-akashom-visual-nonvisual-trailer'].includes(p.id))p.parent='experiments';}
 await page.route('**/manifest.json',r=>r.fulfill({json:manifest}));await page.route('**/site.config.json',r=>r.fulfill({json:config}));
 await page.goto(base+'/personal/#/projects/akashom/architecture');await page.waitForFunction(()=>document.querySelector('.content').dataset.pageId==='projects-akashom-architecture');assert.equal(await page.locator('.receipt-header').textContent(),'Hardware');assert.deepEqual(await page.evaluate(()=>[...expandedGroups]),['projects','projects/akashom']);assert.equal(await page.locator('.file-link').count(),1);
 await page.locator('[data-group="group/experiments"]').click();await page.waitForFunction(()=>activeGroup.key==='group/experiments');assert.equal(await page.locator('.receipt-header').textContent(),'Experiments');assert.equal(await page.locator('.file-link').count(),2);assert.equal(await page.evaluate(()=>receiptState.receiptTucked),false);await ctx.close();
 assert.deepEqual(errors,[]);fs.writeFileSync('.test-results/profiles/results.json',JSON.stringify({results,nestedGroups:'pass',errors},null,2));console.log('PASS profiles, receipt state/animations, accordion, one-rule rows, index lists, gallery and nested groups at all six viewports');
}finally{await browser.close();}}
module.exports=run;if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});
