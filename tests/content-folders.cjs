const {chromium}=require(process.env.PLAYWRIGHT_MODULE||process.argv[2]||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),base=process.env.SITE_URL||'http://127.0.0.1:5173';

async function verifyLiveEdits(browser) {
 const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'site-live-folders-'));
 let server,page;
 try {
  for(const name of ['tools','js'])fs.cpSync(path.join(root,name),path.join(fixture,name),{recursive:true});
  fs.copyFileSync(path.join(root,'build.js'),path.join(fixture,'build.js'));
  fs.symlinkSync(path.join(root,'node_modules'),path.join(fixture,'node_modules'),'dir');
  fs.writeFileSync(path.join(fixture,'site.shell.html'),'<html><head><title>Preview check</title></head><body>Preview check</body></html>');
  fs.writeFileSync(path.join(fixture,'style.css'),'');
  fs.writeFileSync(path.join(fixture,'site.config.json'),JSON.stringify({sections:[{id:'projects',label:'Projects'}]}));
  const source=path.join(fixture,'content/projects/jivan/index.md');
  fs.mkdirSync(path.dirname(source),{recursive:true});
  fs.writeFileSync(source,'---\nid: jivan\ntitle: Jivan\nslug: projects/jivan\ntype: project\naudience: [public, professional]\nstatus: active\npublished: true\ncreated: 2026-01-01\nproject: jivan\n---\nBefore editing.\n');
  let output='';
  server=spawn(process.execPath,['tools/dev.js'],{cwd:fixture,env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe']});
  const url=await new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>reject(new Error('Preview did not start: '+output)),15000);
   server.on('error',error=>{clearTimeout(timeout);reject(error);});
   server.on('exit',code=>{clearTimeout(timeout);reject(new Error('Preview exited '+code+': '+output));});
   server.stderr.on('data',chunk=>{output+=chunk;});
   server.stdout.on('data',chunk=>{
    output+=chunk;const match=output.match(/Preview: (http:\/\/127\.0\.0\.1:\d+)\//);
    if(match){clearTimeout(timeout);resolve(match[1]);}
   });
  });
  page=await browser.newPage();
  const events=()=>page.waitForResponse(response=>response.url()===url+'/__events',{timeout:15000});
  const initialEvents=events();await page.goto(url);await initialEvents;
  async function update(change) {
   const reload=page.waitForEvent('load',{timeout:15000}),reconnect=events();
   change();await Promise.all([reload,reconnect]);
   const response=await page.request.get(url+'/manifest.json');return response.json();
  }
  let manifest=await update(()=>fs.appendFileSync(source,'Saved edit appears automatically.\n'));
  assert.equal(manifest.pages[0].contentFolder,'projects/jivan');
  assert.match(await (await page.request.get(url+'/generated/pages/jivan.md')).text(),/Saved edit appears automatically/);
  const destination=path.join(fixture,'content/projects/akasha/jivan');
  manifest=await update(()=>{fs.mkdirSync(path.dirname(destination),{recursive:true});fs.renameSync(path.dirname(source),destination);});
  assert.equal(manifest.pages[0].contentFolder,'projects/akasha/jivan');
  assert.equal(manifest.pages[0].project,'akasha');
  assert.equal(manifest.pages[0].slug,'projects/jivan');
  const created=path.join(destination,'notes.md');
  manifest=await update(()=>fs.writeFileSync(created,'---\nid: notes\ntitle: Notes\nslug: projects/jivan/notes\ntype: project-note\naudience: [public, professional]\nstatus: active\npublished: true\ncreated: 2026-01-01\n---\nNew note.\n'));
  assert.equal(manifest.pages.length,2);
  manifest=await update(()=>fs.unlinkSync(created));assert.equal(manifest.pages.length,1);
  manifest=await update(()=>fs.unlinkSync(path.join(destination,'index.md')));assert.deepEqual(manifest.pages,[]);
  assert.equal((await page.request.get(url+'/generated/pages/jivan.md')).status(),404);
  assert.equal((await page.request.get(url+'/generated/images/jivan.json')).status(),404);
  console.log('PASS live preview: edits, moves, additions and deletions rebuild and reload the browser; removed output returns 404');
 } finally {
  await page?.close();
  if(server&&server.exitCode===null){const stopped=new Promise(resolve=>server.once('exit',resolve));server.kill('SIGTERM');await stopped;}
  fs.rmSync(fixture,{recursive:true,force:true});
 }
}

async function run() {
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
 const errors=[];fs.mkdirSync(path.join(root,'.test-results/content-folders'),{recursive:true});
 try {
  for(const width of [1440,390])for(const personal of [false,true]){
   const context=await browser.newContext({viewport:{width,height:900},isMobile:width===390,hasTouch:width===390});
   const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
   const shell=personal?'/personal/':'/';
   await page.goto(base+shell+'#/projects/jivan');
   await page.waitForFunction(()=>document.querySelector('.content').dataset.pageId==='projects-jivan');
   assert.equal(await page.evaluate(()=>activeGroup.key),'projects/akasha/jivan');
   assert.equal(await page.locator('[data-group="projects/jivan"]').count(),0);
   assert.equal(await page.locator('[data-group="projects/akasha/jivan"]').getAttribute('aria-current'),'true');
   assert.equal(await page.locator('.receipt-header').textContent(),'Jivan');
   assert.ok(await page.locator('.content .html-embed').count()>0);
   if(width===390)await page.locator('#index-toggle').click();
   await page.locator('[data-group="projects/akasha/jivan"]').waitFor({state:'visible'});
   const parent=await page.locator('[data-group="projects/akasha"]').boundingBox();
   const nested=await page.locator('[data-group="projects/akasha/jivan"]').boundingBox();
   assert.ok(nested.x>parent.x,'nested folder is indented');
   const historyLength=await page.evaluate(()=>history.length);
   await page.locator('[data-group="projects/akasha"]').click();
   await page.waitForFunction(()=>document.querySelector('.content').dataset.pageId==='projects-jivan');
   assert.equal(await page.evaluate(()=>activeGroup.key),'projects/akasha/jivan');
   assert.equal(await page.locator('.file-link').count(),1,'empty parent resolves to its first visible descendant and receipt');
   assert.equal(await page.evaluate(()=>history.length),historyLength,'same resolved descendant adds no history entry');
   if(width===390&&await page.locator('#index-toggle').getAttribute('aria-expanded')==='false')await page.locator('#index-toggle').click();
   await page.screenshot({path:path.join(root,`.test-results/content-folders/${personal?'personal':'work'}-${width}.png`)});
   if(width===390&&await page.locator('#index-toggle').getAttribute('aria-expanded')==='true')await page.locator('#index-close').click();
   await page.evaluate(()=>location.hash='#/home');
   await page.waitForFunction(()=>document.querySelector('.content').dataset.pageId===contentModel.resolve('home').id);
   await page.goBack();await page.waitForFunction(()=>document.querySelector('.content').dataset.pageId==='projects-jivan');
   assert.equal(await page.evaluate(()=>activeGroup.key),'projects/akasha/jivan');
   if(personal){
    await page.goto(base+shell+'#/projects/mindscape/examples/braise');
    await page.waitForFunction(()=>document.querySelector('.content').dataset.pageId==='projects-mindscape-examples-braise');
    assert.equal(await page.evaluate(()=>activeGroup.key),'projects/mindscape/examples');
    assert.equal(await page.locator('.file-link').count(),4);
    await page.goto(base+shell+'#/archive/personal-snapshots/my-chosen-career-path');
    await page.waitForFunction(()=>document.querySelector('.content').dataset.pageId==='archive-personal-snapshots-my-chosen-career-path');
    assert.equal(await page.evaluate(()=>activeGroup.key),'archive/career');
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
   await context.close();console.log(`PASS ${personal?'personal':'work'} ${width}px: nested folders, direct receipts, stable links and history`);
  }
  await verifyLiveEdits(browser);
  assert.deepEqual(errors,[]);
 } finally {await browser.close();}
}
module.exports=run;
if(require.main===module)run().catch(error=>{console.error(error);process.exitCode=1;});
