const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
async function run(){const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});const errors=[],results=[];try{for(const width of [390,1440]){const mobile=width===390,ctx=await browser.newContext({viewport:{width,height:900},isMobile:mobile,hasTouch:mobile});await ctx.addInitScript(()=>{window.audioCalls=[];HTMLMediaElement.prototype.play=function(){audioCalls.push(this.src.split('/').pop());return Promise.resolve();};});const p=await ctx.newPage(),requests=[];p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>requests.push(r.url()));
const ready=id=>p.waitForFunction(id=>document.querySelector('.content').dataset.pageId===id,id);
async function reset(){await p.evaluate(()=>audioCalls=[]);}
async function count(name,n){assert.equal(await p.evaluate(name=>audioCalls.filter(s=>s===name).length,name),n,name);}
async function openIndex(){if(mobile&&await p.locator('#index-toggle').getAttribute('aria-expanded')==='false')await p.locator('#index-toggle').click();}
async function click(key){await openIndex();await p.locator(`[data-group="${key}"]`).click({position:{x:8,y:8}});await p.waitForFunction(key=>activeGroup.key===navigation.pageGroups.get(SiteNavigation.firstLeaf(navigation.catalog.get(key)).id).key,key);}
await p.goto('http://127.0.0.1:5173/');await ready('home-professional');await count('printer2.mp3',0);await count('tuck1.mp3',0);assert.equal(requests.some(u=>u.endsWith('.mp3')),false);
assert.deepEqual(await p.evaluate(()=>navigation.sections.map(n=>n.key)),['home','projects','about','currents']);assert.deepEqual(await p.evaluate(()=>navigation.catalog.get('projects').children.map(n=>n.label)),['Akashom','Cornocupia','Vivarium','Project Mindscape']);assert.equal(await p.evaluate(()=>contentModel.pages.some(p=>p.section==='notes'||p.project==='jivan')),false);
await reset();await click('projects');await count('printer2.mp3',1);await count('tuck1.mp3',1);
await reset();await click('projects/akashom');await ready('projects-akashom');await count('printer2.mp3',1);await count('tuck1.mp3',0);
await reset();await p.locator('.file-link').nth(1).click();await ready('projects-akashom-visual-nonvisual-trailer');await count('printer2.mp3',0);await count('tuck1.mp3',0);
await reset();await p.goBack();await ready('projects-akashom');await count('printer2.mp3',0);await count('tuck1.mp3',0);
await reset();await p.evaluate(()=>{updateReceipt(activeGroup,contentModel.byId.get('projects-akashom'));syncReceiptPosition();});await count('tuck1.mp3',0);
assert.equal(await p.locator('#tuck-files-btn').count(),0);assert.equal(await p.locator('#tuck-folders-btn').count(),1);
await reset();await p.setViewportSize({width:width+1,height:900});await p.waitForTimeout(100);await count('tuck1.mp3',0);
await reset();await click('projects/cornocupia');await ready('projects-cornocupia');await count('tuck1.mp3',1);await count('printer2.mp3',1);
await reset();await p.evaluate(()=>siteMuted=true);await click('projects/akashom');await ready('projects-akashom');await count('printer2.mp3',0);await count('tuck1.mp3',0);await p.evaluate(()=>siteMuted=false);
await reset();await click('home');await ready('home-professional');await count('printer2.mp3',1);await count('tuck1.mp3',1);
await reset();await click('home');await click('home');await count('printer2.mp3',2);await count('tuck1.mp3',0);
for(const [path,id] of [['/#/about','about-professional'],['/#/currents','currents-professional'],['/personal/','home'],['/personal/#/about','about'],['/personal/#/currents','currents-personal']]){await reset();await p.goto('http://127.0.0.1:5173'+path);await ready(id);await count('printer2.mp3',0);await count('tuck1.mp3',0);}
assert.deepEqual(await p.evaluate(()=>navigation.sections.map(n=>n.key)),['home','projects','notes','archive','about','currents']);
let shared;for(const path of ['/#/projects/akashom','/personal/#/projects/akashom']){await p.goto('http://127.0.0.1:5173'+path);await ready('projects-akashom');const source=await p.evaluate(()=>contentModel.resolve('projects/akashom').source);if(shared)assert.equal(source,shared);shared=source;await count('tuck1.mp3',0);}
// Curated exclusion redirects to personal, without leaking into the root model.
await p.goto('http://127.0.0.1:5173/#/projects/jivan');await ready('projects-jivan');assert.equal(new URL(p.url()).pathname,'/personal/');
results.push({width,routes:'pass',audio:'pass',initialAudioRequests:0});await ctx.close();}
assert.deepEqual(errors,[]);fs.mkdirSync('.test-results/identity',{recursive:true});fs.writeFileSync('.test-results/identity/results.json',JSON.stringify({results,errors},null,2));console.log('PASS identity variants, curated/personal navigation, shared projects, and exact audio trigger counts at desktop/mobile');}finally{await browser.close();}}
module.exports=run;if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});
