const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const canvasReady = require('./navigation.cjs');
const { renderedFonts } = require('./fonts.cjs');
const state = page => page.evaluate(async () => (await (await import('/personal/client/main.js')).ready).page);
const ready = async page => { await canvasReady(page); await page.waitForSelector('#editor-tools'); };
const saved = page => page.waitForFunction(() => document.querySelector('#save-status').textContent === 'Saved');
async function drop(page, files, x, y) {
  await page.evaluate(({ files, x, y }) => {
    const transfer = new DataTransfer();
    for (const f of files) transfer.items.add(new File([Uint8Array.from(atob(f.bytes), c => c.charCodeAt(0))], f.name, { type: f.type }));
    document.querySelector('#viewport').dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer, clientX: x, clientY: y }));
  }, { files: files.map(f => ({ name: f.name, type: f.mimeType, bytes: f.buffer.toString('base64') })), x, y });
  await page.waitForSelector('#file-import-menu:not([hidden])');
}
module.exports = async ({ page, browser, origin, root }) => {
  await fs.writeFile(path.join(root,'pages/file-check.json'), JSON.stringify({slug:'file-check',camera:{x:-20,y:-10,zoom:.5},elements:[]}));
  await page.goto(origin+'/personal/?edit5500#/file-check'); await ready(page);
  const org = '#+TITLE: A spatial notebook\n* TODO Investigation\n** Observation\nSome *bold* and /italic/ text with =inline code=.\n\n- first\n  - nested\n\n#+begin_src c\nint main(void) { return 0; }\n#+end_src\n\n| A | B |\n|---+---|\n| 1 | 2 |\n\n[[https://example.org][external]] [[/personal/#/home][home]]\n\n' + 'A long paragraph for reading and scrolling.\n\n'.repeat(45);
  const file={name:'notebook.org',mimeType:'text/plain',buffer:Buffer.from(org)};
  const expected=await page.evaluate(async () => { const app=await (await import('/personal/client/main.js')).ready; const p=app.camera.toWorld(app.camera.point({clientX:780,clientY:350})); return {x:Math.round(p.x),y:Math.round(p.y)}; });
  await drop(page,[file],780,350); await page.locator('#import-render').click();
  await page.waitForSelector('.document[data-loaded=true]'); await saved(page);
  const e=(await state(page)).elements[0]; assert.equal(e.type,'file'); assert.equal(e.filename,'notebook.org'); assert.equal(e.display,'render');
  assert.deepEqual({x:e.x,y:e.y},expected); assert.equal(e.font,'xanh'); assert.equal(e.fontSize,18);
  assert.equal(await fs.readFile(path.join(root,'assets',path.basename(e.src)),'utf8'),org);
  assert.equal(await page.locator('.document h1').first().textContent(),'A spatial notebook');
  assert.ok(await page.locator('.document').evaluate(n=>n.scrollHeight>n.clientHeight));
  assert.ok((await renderedFonts(page,'.document p')).some(f=>f.familyName==='Xanh Mono'&&f.isCustomFont));
  // The existing properties control font, box height, mode and source identity.
  await page.locator('#prop-font').selectOption('zenbones'); await saved(page); await page.evaluate(()=>document.fonts.ready);
  assert.ok((await renderedFonts(page,'.document p')).some(f=>f.familyName==='Zenbones Mono'&&f.isCustomFont));
  await page.locator('#prop-font').selectOption('xanh');
  await page.locator('#prop-label').fill('Field notebook'); await page.locator('#prop-label').press('Tab'); await saved(page);
  await page.locator('#prop-display').selectOption('attach'); await saved(page);
  assert.match(await page.locator('.attachment').textContent(),/Field notebook/); assert.match(await page.locator('.attachment').getAttribute('href'),/\.org.zip$/);
  const attached=(await state(page)).elements[0]; assert.equal(attached.src,e.src); assert.deepEqual([attached.x,attached.y,attached.width,attached.height],[e.x,e.y,e.width,e.height]);
  await page.locator('#prop-display').selectOption('render'); await page.waitForSelector('.document[data-loaded=true]'); await saved(page);
  await page.locator('#prop-width').fill('20'); await page.locator('#prop-width').press('Tab');
  await page.locator('#prop-height').fill('8'); await page.locator('#prop-height').press('Tab'); await saved(page);
  assert.deepEqual([(await state(page)).elements[0].width,(await state(page)).elements[0].height,(await state(page)).elements[0].fontSize],[20,8,18]);
  const before=(await state(page)).elements[0];
  const choosing=page.waitForEvent('filechooser'); await page.locator('#replace-source').click();
  await (await choosing).setFiles({name:'revised.md',mimeType:'text/markdown',buffer:Buffer.from('# Revised essay\n\n[End](#end) · [Home](/personal/#/home) · [External](https://example.org)\n\n**Updated**, same box.\n\n'+ 'More reading.\n\n'.repeat(60)+'\n## End\nThe final paragraph.')});
  await page.waitForFunction(()=>document.querySelector('.document h1')?.textContent==='Revised essay'); await saved(page);
  const replaced=(await state(page)).elements[0]; assert.notEqual(replaced.src,before.src);
  assert.deepEqual({...replaced,src:before.src,filename:before.filename},before);
  assert.equal(await fs.readFile(path.join(root,'assets',path.basename(before.src)),'utf8'),org,'replacement never overwrites the old source');
  await page.locator('#undo').click(); await saved(page); assert.equal((await state(page)).elements[0].src,before.src);
  await page.locator('#redo').click(); await saved(page); assert.equal((await state(page)).elements[0].src,replaced.src);
  await page.locator('#properties summary').click(); await page.locator('#editor-tools summary').click();
  // Documents move by dragging their body, just like ordinary canvas objects.
  const grip=await page.locator('.document-preview').boundingBox();
  await page.mouse.move(grip.x+20,grip.y+4); await page.mouse.down(); await page.mouse.move(grip.x+44,grip.y+28,{steps:4}); await page.mouse.up(); await saved(page);
  const moved=(await state(page)).elements[0]; assert.equal(moved.x,replaced.x+2); assert.equal(moved.y,replaced.y+2);
  await page.keyboard.press('Control+d'); await saved(page);
  assert.equal((await state(page)).elements.length,2); assert.equal(new Set((await state(page)).elements.map(e=>e.id)).size,2);
  // Shift-click exposed text adds the original to the selected duplicate.
  const original = page.locator(`[data-id="${e.id}"] .document`);
  await original.click({position:{x:5,y:28},modifiers:['Shift']});
  assert.equal(await page.locator('.object.selected').count(),2);
  const groupBefore=(await state(page)).elements.map(e=>({...e}));
  const groupGrip=await page.locator(`[data-id="${e.id}"] .document-preview`).boundingBox();
  await page.mouse.move(groupGrip.x+5,groupGrip.y+4); await page.mouse.down();
  await page.mouse.move(groupGrip.x+29,groupGrip.y+28,{steps:4}); await page.mouse.up(); await saved(page);
  assert.deepEqual((await state(page)).elements.map(e=>[e.x,e.y]),groupBefore.map(e=>[e.x+2,e.y+2]));
  await page.keyboard.press('Control+z'); await saved(page);
  assert.deepEqual((await state(page)).elements,groupBefore,'one undo restores a whole file group drag');
  await page.keyboard.press('Control+z'); await saved(page); assert.equal((await state(page)).elements.length,1);
  await original.click({position:{x:40,y:60}});
  if (!await page.locator('#properties').evaluate(n=>n.open)) await page.locator('#properties summary').click();
  await page.locator('#prop-locked').check(); await saved(page);
  assert.equal(await page.locator('.resize-handle').count(),0);
  const locked=(await state(page)).elements[0];
  const lockedGrip=await page.locator('.document-preview').boundingBox();
  await page.mouse.move(lockedGrip.x+15,lockedGrip.y+4); await page.mouse.down(); await page.mouse.move(lockedGrip.x+39,lockedGrip.y+28); await page.mouse.up();
  assert.deepEqual((await state(page)).elements[0],locked);
  await page.locator('#prop-locked').uncheck(); await page.locator('#prop-maximizable').uncheck(); await saved(page);
  assert.equal(await page.locator('.focus-object').count(),0); assert.equal(await page.locator('.document').count(),1);
  await page.locator('#prop-maximizable').check(); await saved(page);
  await page.locator('#properties summary').click();
  await page.locator('#editor-tools summary').click();
  const media=[
    {name:'animation.gif',mimeType:'image/gif',buffer:await fs.readFile(path.join(__dirname,'fixtures/import-animation.gif'))},
    {name:'clip.webm',mimeType:'video/webm',buffer:await fs.readFile(path.join(__dirname,'fixtures/import-clip.webm'))},
    {name:'program.c',mimeType:'text/plain',buffer:Buffer.from('int main(void) { return 0; }')},
  ];
  await drop(page,media,880,250); await page.locator('#import-render').click();
  await page.locator('#import-render').click(); await page.waitForSelector('#import-render:not([hidden])');
  await page.locator('#import-attach').click(); await page.waitForFunction(async()=> (await (await import('/personal/client/main.js')).ready).page.elements.length===4); await saved(page);
  const added=(await state(page)).elements.slice(1).sort((a,b)=>a.x-b.x);
  assert.deepEqual(added.map(e=>e.filename),['animation.gif','clip.webm','program.c']);
  assert.equal(added[1].x,added[0].x+1); assert.equal(added[2].y,added[0].y+2);
  const video=page.locator('video'); await video.evaluate(n=>new Promise(resolve=>n.readyState>=1?resolve():n.addEventListener('loadedmetadata',resolve,{once:true})));
  assert.deepEqual(await video.evaluate(n=>[n.paused,n.controls,n.autoplay,n.preload]),[true,true,false,'metadata']);
  const gif=page.locator(`.object[data-id="${added[0].id}"] img`); assert.ok(await gif.evaluate(n=>n.complete&&n.naturalWidth===16));
  // MP4 uses the same renderer and native focused playback controls.
  const videoObject=added[1];
  await page.evaluate(async id=>(await (await import('/personal/client/main.js')).ready).selectFile(id,false),videoObject.id);
  if (!await page.locator('#properties').evaluate(n=>n.open)) await page.locator('#properties summary').click();
  const videoChoosing=page.waitForEvent('filechooser');await page.locator('#replace-source').click();
  await (await videoChoosing).setFiles(path.join(__dirname,'fixtures/import-clip.mp4'));
  await page.waitForFunction(()=>document.querySelector('video')?.src.endsWith('.mp4'));await saved(page);
  await page.evaluate(async id=>{const app=await (await import('/personal/client/main.js')).ready;app.focus(app.page.elements.find(e=>e.id===id));},videoObject.id);
  const focusedVideo=page.locator('#focus-content video');
  await focusedVideo.evaluate(async n=>{n.muted=true;await n.play();});assert.equal(await focusedVideo.evaluate(n=>n.paused),false);
  const playingHandle=await focusedVideo.elementHandle();
  await page.locator('#close-focus').click();await page.waitForFunction(()=>!document.querySelector('#focus-content video'));
  assert.equal(await playingHandle.evaluate(n=>n.paused),true);await playingHandle.dispose();
  // Active formats remain safe ZIP attachments; Render displays only their source text.
  await drop(page,[{name:'unsafe.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg onload="alert(1)"></svg>')}],1000,350);
  await page.waitForSelector('#import-render:not([hidden])'); await page.locator('#import-attach').click(); await page.waitForFunction(async()=> (await (await import('/personal/client/main.js')).ready).page.elements.length===5); await saved(page);
  const unsafe=(await state(page)).elements.at(-1); assert.match(await page.locator(`[data-id="${unsafe.id}"] a.attachment`).getAttribute('href'),/\.svg.zip$/);
  if (!await page.locator('#properties').evaluate(n=>n.open)) await page.locator('#properties summary').click();
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#download-source').click()]);
  assert.equal(download.suggestedFilename(),'unsafe.svg.zip');
  // Isolate reading tests from other newly imported spatial objects.
  await page.evaluate(async id=>{const app=await (await import('/personal/client/main.js')).ready; for(const e of app.page.elements)if(e.id!==id){e.x+=100;app.update(e);} document.querySelector('#save-page').click();},e.id); await saved(page);
  await page.goto(origin+'/personal/#/file-check'); await canvasReady(page); await page.waitForSelector('.document[data-loaded=true]');
  await page.evaluate(async()=>{const app=await (await import('/personal/client/main.js')).ready,e=app.page.elements[0];app.camera.set({x:e.x+12,y:e.y+8,zoom:1});});
  const camera=await page.evaluate(async()=>({...((await (await import('/personal/client/main.js')).ready).camera.value)}));
  const doc=page.locator('.document'); const box=await doc.boundingBox();
  assert.equal(await doc.locator('a[href]').count(),0,'preview links cannot steal focus clicks');
  assert.equal(await page.locator(`[data-id="${e.id}"] .focus-object`).count(),0,'documents have no secondary focus arrow');
  await page.evaluate(async()=>{const app=await (await import('/personal/client/main.js')).ready;app.camera.setWheelMode('trackpad');});
  await page.mouse.move(box.x+80,box.y+100); await page.mouse.wheel(24,36); await page.waitForTimeout(80);
  const panned=await page.evaluate(async()=>({...((await (await import('/personal/client/main.js')).ready).camera.value)}));
  assert.equal(panned.x,camera.x+1); assert.equal(panned.y,camera.y+1.5);
  assert.equal(await doc.evaluate(n=>n.scrollTop),0);
  await page.evaluate(async camera=>(await (await import('/personal/client/main.js')).ready).camera.set(camera),camera);
  await page.keyboard.down('Space');await page.mouse.move(box.x+80,box.y+100);await page.mouse.down();await page.mouse.move(box.x+128,box.y+124);await page.mouse.up();await page.keyboard.up('Space');
  assert.equal(await page.locator('#focus-view').evaluate(n=>n.open),false,'drag does not open focus');
  assert.equal(await page.evaluate(async()=>(await (await import('/personal/client/main.js')).ready).camera.value.x),camera.x-2);
  await page.evaluate(async camera=>(await (await import('/personal/client/main.js')).ready).camera.set(camera),camera);
  await page.waitForTimeout(380);await doc.click({position:{x:80,y:100}});
  await page.waitForSelector('#focus-content .document[data-loaded=true]');
  const focused=page.locator('#focus-content .document'),route=page.url();
  assert.ok(await page.locator('#focus-view').evaluate(n=>n.scrollHeight>n.clientHeight));
  assert.equal(await focused.evaluate(n=>getComputedStyle(n).overflow),'visible');
  assert.equal(await page.locator('#breadcrumbs').evaluate(n=>getComputedStyle(n).visibility),'hidden');
  await focused.locator('a',{hasText:'End'}).click();assert.equal(page.url(),route);
  assert.ok(await page.locator('#focus-view').evaluate(n=>n.scrollTop>0));
  assert.match(await focused.locator('a',{hasText:'Home'}).getAttribute('href'),/#\/file-check\/home$/);
  assert.equal(await focused.locator('a',{hasText:'External'}).getAttribute('rel'),'noopener noreferrer');
  assert.equal(await focused.evaluate(node=>{
    const range=document.createRange();range.selectNodeContents(node.querySelector('p'));
    const selection=getSelection();selection.removeAllRanges();selection.addRange(range);
    const event=new ClipboardEvent('copy',{bubbles:true,cancelable:true,clipboardData:new DataTransfer()});node.dispatchEvent(event);
    selection.removeAllRanges();return event.defaultPrevented;
  }),false,'focus keeps native text copying');
  await page.locator('#close-focus').click();await page.waitForFunction(()=>!document.querySelector('#focus-content').children.length);
  assert.deepEqual(await page.evaluate(async()=>({...((await (await import('/personal/client/main.js')).ready).camera.value)})),camera);
  await doc.focus();await page.keyboard.press('Enter');await page.waitForSelector('#focus-content .document[data-loaded=true]');
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#focus-content').children.length);
  await page.screenshot({path:'/tmp/zibaldone-files-desktop.png'});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  try {
    const p=await context.newPage();await p.goto(origin+'/personal/#/file-check');await canvasReady(p);await p.waitForSelector('.document[data-loaded=true]');
    await p.evaluate(async()=>{const app=await (await import('/personal/client/main.js')).ready,e=app.page.elements[0];app.camera.set({x:e.x+12,y:e.y+5,zoom:.6});});
    const before=await p.evaluate(async()=>({...((await (await import('/personal/client/main.js')).ready).camera.value)}));
    const session=await context.newCDPSession(p);
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:170,y:450,id:1}]});
    for(let y=440;y>=360;y-=10)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:170,y,id:1}]});
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert.equal(await p.locator('.document').evaluate(n=>n.scrollTop),0);
    assert.ok(await p.evaluate(async y=>(await (await import('/personal/client/main.js')).ready).camera.value.y>y,before.y));
    assert.equal(await p.locator('#focus-view').evaluate(n=>n.open),false);
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:140,y:450,id:1}]});
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:140,y:450,id:1},{x:240,y:450,id:2}]});
    await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:110,y:450,id:1},{x:270,y:450,id:2}]});
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert.ok(await p.evaluate(async z=>(await (await import('/personal/client/main.js')).ready).camera.value.zoom>z,before.zoom),'pinching over a document still uses canvas zoom');
    // Place a smaller document wholly inside the screen: pinch can straddle its edge.
    await p.evaluate(async()=>{const app=await (await import('/personal/client/main.js')).ready,e=app.page.elements[0];app.camera.set({x:e.x+10,y:e.y+4,zoom:.4});});
    for (const reverse of [false,true]) {
      const fingers=reverse?[{x:340,y:450,id:1},{x:150,y:450,id:2}]:[{x:150,y:450,id:1},{x:340,y:450,id:2}];
      await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[fingers[0]]});
      await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:fingers});
      await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:fingers.map(p=>({...p,x:p.x<200?p.x-20:p.x+20}))});
      await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      assert.ok(await p.evaluate(async()=>(await (await import('/personal/client/main.js')).ready).camera.value.zoom>.4));
      await p.evaluate(async()=>{const app=await (await import('/personal/client/main.js')).ready,e=app.page.elements[0];app.camera.set({x:e.x+10,y:e.y+4,zoom:.4});});
    }
    await p.waitForTimeout(380);await p.touchscreen.tap(150,450);await p.waitForSelector('#focus-content .document[data-loaded=true]');
    assert.ok(await p.locator('#focus-view').evaluate(n=>n.scrollHeight>n.clientHeight));
    await p.locator('#close-focus').tap();
    await p.screenshot({path:'/tmp/zibaldone-files-mobile.png'});
  } finally {await context.close();}
  await fs.writeFile(path.join(root,'pages/text-check.json'),JSON.stringify({slug:'text-check',camera:{x:0,y:0,zoom:1},elements:[]}));
  await page.goto(origin+'/personal/?edit5500#/text-check');await ready(page);
  const sources=[
    ['program.c','#include <stdio.h>\nint main(void) { return 0; }'],
    ['boot.s','.text\nmain:\n\tmov $1, %rax\n'],
    ['novel.unknown','A paragraph\n\n*literal*, not Markdown.'],
    ['Makefile','all:\n\tcc main.c -o main\n'],
    ['active.html','<script>window.importExecuted=true</script>\n<b>plain text</b>'],
  ];
  for (const [name,text] of sources) {
    await drop(page,[{name,mimeType:'',buffer:Buffer.from(text)}],820,400);
    await page.locator('#import-render').click();await saved(page);
    await page.waitForFunction(count=>document.querySelectorAll('.plain-text').length===count,sources.findIndex(e=>e[0]===name)+1);
    const imported=(await state(page)).elements.at(-1);
    assert.equal(imported.plainText,true);assert.equal(imported.display,'render');
    assert.equal(await page.locator(`[data-id="${imported.id}"] .plain-text`).textContent(),text);
  }
  assert.equal(await page.evaluate(()=>window.importExecuted),undefined);
  assert.equal(await page.locator('.document-preview script,.document-preview b').count(),0);
  await drop(page,[{name:'binary.dat',mimeType:'',buffer:Buffer.from([0,1,255,127])}],950,400);
  await page.waitForTimeout(40);assert.equal(await page.locator('#import-render').isVisible(),false);
  await page.locator('#import-attach').click();await saved(page);
  assert.equal((await state(page)).elements.at(-1).plainText,false);
  assert.equal(await page.locator('#prop-display option[value=render]').isDisabled(),true);
  console.log('File imports verified: plain/source text detection, binary rejection, drop coordinates, snapping/zoom, Org/Markdown, real fonts, ordinary object pan/focus, source replacement/history, duplication, GIF/video, safe attachments, autosave and mobile gestures.');
};
module.exports.static=async({page,origin,base})=>{
  await page.goto(origin+base+'#/file-check');await canvasReady(page);await page.waitForSelector('.document[data-loaded=true]');
  assert.match(await page.locator('.document').textContent(),/Revised essay/);
  assert.equal(await page.locator('#file-import-menu').count(),0);
  assert.match(await page.locator('.attachment').first().getAttribute('href'),new RegExp('^'+base.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'assets/'));
  for(const url of ['client/file-editor.js','files.mjs','documents.mjs'])assert.equal((await page.request.get(origin+base+url)).status(),404);
  await page.goto(origin+base+'#/text-check');await canvasReady(page);
  await page.waitForFunction(()=>document.querySelectorAll('.plain-text').length===5);
  assert.equal(await page.evaluate(()=>window.importExecuted),undefined);
  assert.match(await page.locator('.plain-text').first().textContent(),/#include <stdio.h>/);
};
