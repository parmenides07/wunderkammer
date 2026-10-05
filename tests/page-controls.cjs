const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
module.exports=async function(){
 const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});const errors=[],results=[];
 fs.mkdirSync('.test-results/page-controls',{recursive:true});
 try{for(const width of [390,1440,1920]){
 const mobile=width===390,ctx=await browser.newContext({viewport:{width,height:900},isMobile:mobile,hasTouch:mobile});
 await ctx.addInitScript(()=>{window.calls=[];HTMLMediaElement.prototype.play=function(){calls.push(this.src.split('/').pop());return Promise.resolve();};});
 const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));
 const ready=slug=>p.waitForFunction(slug=>document.querySelector('.content').dataset.pageId===contentModel.resolve(slug)?.id,slug);
 async function route(slug){await p.evaluate(slug=>location.hash='#/'+slug,slug);await ready(slug);}
 async function next(target){assert.equal(await p.locator('#next-page-btn').getAttribute('data-target'),target);await p.locator('.content').evaluate(e=>e.scrollTop=e.scrollHeight);await p.locator('#next-page-btn').scrollIntoViewIfNeeded();await p.locator('#next-page-btn').click();await ready(target);}
 for(const shell of ['/','/personal/']){
 await p.goto('http://127.0.0.1:5173'+shell);await ready('home');const origin=await p.evaluate(()=>performance.timeOrigin);
 assert.equal(await p.locator('#tuck-files-btn').count(),0);assert.equal(await p.locator('#tuck-folders-btn').count(),1);
 await next('about');await next('currents');assert.equal(await p.locator('#next-page-btn').isVisible(),false);assert.equal(await p.evaluate(()=>performance.timeOrigin),origin);assert.equal(await p.evaluate(()=>calls.filter(s=>s==='printer2.mp3').length),0);
 await p.goBack();await ready('about');await p.goForward();await ready('currents');
 // Genuine left-paper and receipt clicks enter the same internal trail.
 if(!mobile){
 await p.locator('[data-group="projects"]').click({position:{x:8,y:8}});await ready('projects/zion');
 await p.locator('.file-link').last().click();await ready('projects/zion/architecture');
 await p.locator('.cardicon2').click();await ready('projects/zion');
 await p.locator('.cardicon2').click();await ready('currents');
 }
 // The custom control follows its internal trail and never follows parent containers.
 if(!mobile){for(const slug of ['about','home']){await p.locator('.cardicon2').click();await ready(slug);}await p.locator('.cardicon2').click();await ready('home');}
 await p.goto('http://127.0.0.1:5173'+shell+'#/projects/zion/architecture');await ready('projects/zion/architecture');
 assert.equal(await p.locator('#next-page-btn').isVisible(),false);await p.reload();await ready('projects/zion/architecture');
 if(!mobile){await p.locator('.cardicon2').click();await ready('home');}
 await route('projects/zion');const siblings=await p.evaluate(()=>activeGroup.pages.map(p=>p.slug));
 for(const slug of siblings.slice(1))await next(slug);
 assert.equal(await p.locator('#next-page-btn').isVisible(),false);assert.equal(await p.locator('.receipt-header').textContent(),'ZION');
 await route('projects/cornocupia');assert.equal(await p.locator('#next-page-btn').isVisible(),false);
 // Automatic movement, one sound per change; unchanged state/resize stays silent.
 await p.evaluate(()=>calls=[]);await route('projects/zion');await p.waitForTimeout(400);
 assert.equal(await p.evaluate(()=>calls.filter(s=>s==='tuck1.mp3').length),1);
 await p.evaluate(()=>{calls=[];updateReceipt(activeGroup,contentModel.resolve('projects/zion'));syncReceiptPosition();});
 assert.equal(await p.evaluate(()=>calls.filter(s=>s==='tuck1.mp3').length),0);
 const panel=p.locator('#card-files-panel'),before=await panel.boundingBox();
 await route('projects/cornocupia');await p.waitForTimeout(400);const after=await panel.boundingBox();
 assert.equal(await p.evaluate(()=>calls.filter(s=>s==='tuck1.mp3').length),1);
 if(!mobile){assert.ok(after.y+after.height<0);assert.ok(Math.abs(after.x-before.x)<1);}
 assert.notEqual(await panel.evaluate(e=>getComputedStyle(e).display),'none');
 assert.equal(await p.locator('#folder-line path').count(),0);
 for(let i=0;i<3;i++)for(const slug of ['projects/zion','projects/cornocupia','projects/zion/architecture'])await route(slug);
 assert.equal(await p.evaluate(()=>receiptState.receiptTucked),false);
 if(!mobile){await route('home');await route('projects/zion');await route('projects/zion/architecture');await route('currents');
 for(const slug of ['projects/zion/architecture','projects/zion','home']){await p.locator('.cardicon2').click();await ready(slug);}
 await p.goBack();await ready('projects/zion');await p.goForward();await ready('home');}
 assert.equal(new URL(p.url()).pathname,shell);
 }
 await p.goto('http://127.0.0.1:5173/');await ready('home');await p.waitForTimeout(900);
 await p.screenshot({path:'.test-results/page-controls/home-'+width+'.png'});
 const geometry=await p.evaluate(()=>Object.fromEntries(['.content-bg','.content-text','.leftbg img','.material'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return[s,{x:r.x,y:r.y,w:r.width,h:r.height}]})));
 if(!mobile){assert.ok(Math.abs(geometry['.leftbg img'].x+geometry['.leftbg img'].w-geometry['.material'].x)<1);assert.equal(await p.locator('.content').evaluate(e=>getComputedStyle(e).lineHeight),width===1440?'18.72px':'22.88px');}
 else{assert.ok(Math.abs(geometry['.content-bg'].w-351.625)<1);await p.locator('#index-toggle').click();await p.locator('[data-group="projects"]').click();await ready('projects/zion');await p.locator('#index-close').click();}
 results.push({width,geometry});await ctx.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync('.test-results/page-controls/results.json',JSON.stringify({results,errors},null,2));console.log('PASS page controls, browser history, sibling boundaries, automatic vertical receipt, audio and desktop/mobile geometry');
 }finally{await browser.close();}
};
