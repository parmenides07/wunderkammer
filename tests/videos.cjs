const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.SITE_URL||'http://127.0.0.1:5173';
const manifest=require('../manifest.json');
const vivarium=manifest.pages.find(p=>p.id==='projects-vivarium');
const main='video[src*="vivariummain.mp4"]';
async function appearance(button){
  return button.evaluate(el=>{
    const style=getComputedStyle(el),svg=el.querySelector('svg');
    return {icon:svg.outerHTML,label:el.getAttribute('aria-label'),title:el.title,
      styles:Object.fromEntries(['width','height','backgroundColor','border','borderRadius','boxShadow'].map(key=>[key,style[key]])),
      iconWidth:getComputedStyle(svg).width,
      play:getComputedStyle(el.querySelector('.animation-icon-play')).display,
      pause:getComputedStyle(el.querySelector('.animation-icon-pause')).display};
  });
}
async function run(){
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
  const errors=[],failures=[],results=[],videoControls={};
  fs.mkdirSync('.test-results/videos',{recursive:true});
  async function setup(width,shell){
    const context=await browser.newContext({viewport:{width,height:900},isMobile:width<900,hasTouch:width<900,deviceScaleFactor:width<900?2:1});
    const page=await context.newPage();
    page.on('pageerror',error=>errors.push(error.message));
    page.on('response',response=>{if(/\.(mp4|webm)(?:[?#]|$)/i.test(response.url())&&response.status()>=400)failures.push(response.url());});
    await page.goto(`${base}${shell}#/projects/vivarium`);
    await page.waitForFunction(()=>document.querySelector('.content').dataset.pageId==='projects-vivarium');
    return {context,page};
  }
  async function playing(page,selector){
    await page.locator(selector).scrollIntoViewIfNeeded();
    await page.waitForFunction(selector=>{const v=document.querySelector(selector);return v.readyState>=2&&v.videoWidth>0&&!v.paused;},selector);
    const start=await page.locator(selector).evaluate(v=>v.currentTime);
    await page.waitForFunction(({selector,start})=>document.querySelector(selector).currentTime!==start,{selector,start});
  }
  async function clickVideo(page,selector,mobile){
    const video=page.locator(selector);
    await video.scrollIntoViewIfNeeded();
    if(mobile)await video.tap({position:{x:20,y:20}});
    else await video.click({position:{x:20,y:20}});
  }
  try{
    // Actual server MIME and range handling (also used by mobile video players).
    for(const [file,type] of [['content/projects/vivarium/assets/vivariummain.mp4','video/mp4'],['tests/fixtures/videos/loop.webm','video/webm'],['tests/fixtures/pdf/one-page.pdf','application/pdf']]){
      const response=await fetch(`${base}/${file}`,{headers:{Range:'bytes=0-99'}});
      assert.equal(response.status,206);assert.match(response.headers.get('content-type'),new RegExp(type));
      assert.equal(response.headers.get('content-length'),'100');
      assert.deepEqual(Buffer.from(await response.arrayBuffer()),fs.readFileSync(file).subarray(0,100));
    }
    for(const shell of ['/','/personal/'])for(const width of [1440,375,320]){
      const {context,page}=await setup(width,shell);
      assert.equal(await page.locator('.content video.embedded-video').count(),3);
      assert.equal(await page.locator('.content img[src*=".mp4"],.content .image-viewer[href*=".mp4"]').count(),0);
      assert.equal(await page.locator('.content .katex').count(),23,'math preserved');
      const button=page.locator(`${main} + .animation-control`);
      await page.locator(main).scrollIntoViewIfNeeded();
      await page.waitForFunction(selector=>document.querySelector(selector).readyState>=2,main);
      assert.ok(await page.locator(main).evaluate(v=>v.paused&&!v.autoplay&&v.currentTime===0),'starts paused like GIF previews');
      assert.equal(await button.getAttribute('aria-label'),'Play animation');
      const pausedAppearance=await appearance(button);
      assert.equal(pausedAppearance.styles.width,'64px');
      await page.locator(main).evaluate(video=>{
        window.originalVideo=video;window.parentClicks=0;
        video.parentElement.parentElement.addEventListener('click',()=>window.parentClicks++);
      });
      if(width!==320&&shell==='/')await page.screenshot({path:`.test-results/videos/vivariummain-${width}-paused.png`});
      await clickVideo(page,main,width<900);
      await playing(page,main);
      await page.waitForFunction(selector=>document.querySelector(selector).nextElementSibling.getAttribute('aria-label')==='Pause animation',main);
      const playingAppearance=await appearance(button);
      assert.equal(playingAppearance.styles.width,'48px');
      if(shell==='/')videoControls[width]={paused:pausedAppearance,playing:playingAppearance};
      const metrics=await page.locator(main).evaluate(video=>{
        const rect=video.getBoundingClientRect(),style=getComputedStyle(video);
        const image=document.createElement('img');video.parentElement.append(image);
        const imageStyle=getComputedStyle(image);
        const shared=['width','marginTop','marginBottom','marginLeft','marginRight','borderRadius','borderTopWidth','boxSizing'];
        const stylesMatch=shared.every(key=>style[key]===imageStyle[key]);image.remove();
        return {src:video.currentSrc,viewport:innerWidth,width:rect.width,height:rect.height,
          ratio:(rect.width-parseFloat(style.borderLeftWidth)-parseFloat(style.borderRightWidth))/(rect.height-parseFloat(style.borderTopWidth)-parseFloat(style.borderBottomWidth)),
          nativeRatio:video.videoWidth/video.videoHeight,videoWidth:video.videoWidth,videoHeight:video.videoHeight,
          autoplay:video.autoplay,muted:video.muted,defaultMuted:video.defaultMuted,loop:video.loop,inline:video.playsInline,controls:video.controls,
          stylesMatch,objectFit:style.objectFit,inText:!!video.closest('.content-text'),inViewer:!!video.closest('.image-viewer'),textOnly:video.closest('.content').classList.contains('text-only'),
          overflow:document.documentElement.scrollWidth>innerWidth||document.querySelector('.content').scrollWidth>document.querySelector('.content').clientWidth+1};
      });
      assert.equal(metrics.src,`${base}/content/projects/vivarium/assets/vivariummain.mp4`);
      assert.deepEqual([metrics.videoWidth,metrics.videoHeight],[1894,1534]);
      assert.ok(Math.abs(metrics.ratio-metrics.nativeRatio)<.01,'native aspect ratio');
      for(const key of ['muted','defaultMuted','loop','inline','stylesMatch'])assert.equal(metrics[key],true,key);
      for(const key of ['autoplay','controls','inText','inViewer','textOnly','overflow'])assert.equal(metrics[key],false,key);
      assert.equal(metrics.objectFit,'contain');
      // Pause well after the beginning, then verify both the timestamp and decoded frame.
      await page.locator(main).evaluate(v=>v.currentTime=3);
      await page.waitForFunction(selector=>document.querySelector(selector).currentTime>3.1,main);
      await clickVideo(page,main,width<900);
      await page.waitForFunction(selector=>document.querySelector(selector).paused,main);
      const pausedAt=await page.locator(main).evaluate(v=>v.currentTime);
      async function frame(){return page.locator(main).evaluate(v=>{
        const canvas=document.createElement('canvas');canvas.width=96;canvas.height=72;
        canvas.getContext('2d').drawImage(v,0,0,96,72);return canvas.toDataURL();
      });}
      const pausedFrame=await frame();
      await page.waitForTimeout(200);
      assert.equal(await page.locator(main).evaluate(v=>v.currentTime),pausedAt);
      assert.equal(await frame(),pausedFrame,'paused frame remains visible and unchanged');
      await clickVideo(page,main,width<900);
      await playing(page,main);
      assert.ok(await page.locator(main).evaluate((v,time)=>v.currentTime>=time,pausedAt),'resume continues, never restarts');
      // Native button semantics cover Enter/Space as well as tapping the overlay.
      await button.focus();await page.keyboard.press('Space');
      await page.waitForFunction(selector=>document.querySelector(selector).paused,main);
      await page.evaluate(()=>refreshUnread());
      assert.ok(await page.locator(main).evaluate(v=>v===originalVideo&&v.paused),'unrelated navigation UI updates preserve the player');
      const manualPause=await page.locator(main).evaluate(v=>v.currentTime);
      await page.locator('.content h2').last().scrollIntoViewIfNeeded();
      await page.locator(main).scrollIntoViewIfNeeded();
      await page.waitForTimeout(150);
      assert.ok(await page.locator(main).evaluate((v,time)=>v.paused&&v.currentTime===time,manualPause),'scrolling does not undo a manual pause');
      await button.focus();await page.keyboard.press('Enter');
      await playing(page,main);
      await page.locator(main).evaluate(v=>v.currentTime=v.duration-.1);
      await page.waitForFunction(selector=>{const v=document.querySelector(selector);return v.currentTime<1&&!v.paused;},main);
      await page.mouse.move(0,899);
      await button.evaluate(el=>el.blur());
      if(width!==320&&shell==='/')await page.screenshot({path:`.test-results/videos/vivariummain-${width}-playing.png`});
      await page.locator('.content h2').last().scrollIntoViewIfNeeded();
      await page.waitForFunction(selector=>document.querySelector(selector).paused,main);
      await playing(page,main);
      // Exercise the Page Visibility handler without relying on headless tab focus.
      await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
      assert.ok(await page.locator(main).evaluate(v=>v.paused));
      await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
      await playing(page,main);
      await button.click();
      await page.waitForFunction(selector=>document.querySelector(selector).paused,main);
      await page.evaluate(()=>{
        Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));
        delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));
      });
      assert.ok(await page.locator(main).evaluate(v=>v.paused),'visibility changes respect manual pause');
      assert.equal(await page.evaluate(()=>parentClicks),0,'media and controls stop parent click handlers');
      assert.equal(await page.locator('.pswp').count(),0,'video never opens the lightbox');
      await page.locator(main).evaluate(v=>window.previousVideo=v);
      await page.evaluate(()=>location.hash='#/about');
      await page.waitForFunction(id=>document.querySelector('.content').dataset.pageId===id,shell==='/personal/'?'about':'about-professional');
      assert.ok(await page.evaluate(()=>previousVideo.paused&&!previousVideo.isConnected&&!previousVideo.hasAttribute('src')),'navigation disposes video');
      results.push({shell,...metrics});
      await context.close();
    }
    // Browser-only authoring fixture: no changes to published Markdown or manifest.
    for(const shell of ['/','/personal/']){
      const {context,page}=await setup(375,shell);
      const fixtureManifest=structuredClone(manifest);
      fixtureManifest.assetDirectories['tests/fixtures/videos']=['loop.webm'];
      await page.route('**/manifest.json',route=>route.fulfill({json:fixtureManifest}));
      const body='[![Reference][clip]](#/about)\n\n[clip]: ../../../tests/fixtures/videos/loop%2Ewebm?v=1#t=0 "Loop & title"\n\n![Still](assets/viv.jpg)\n\n`![Literal](assets/example.mp4)`\n\n[Download](../../../tests/fixtures/videos/loop.webm)\n\nimages{../../../tests/fixtures/videos, full}\n\n![Paper](../../../tests/fixtures/pdf/one-page.pdf)';
      await page.route(`**/${vivarium.source}`,route=>route.fulfill({body,contentType:'text/plain'}));
      await page.reload();
      await page.waitForFunction(()=>document.querySelector('.content').dataset.pageId==='projects-vivarium');
      assert.equal(await page.locator('.content video').count(),2);
      assert.equal(await page.locator('video.full-width-img').count(),1);
      assert.equal(await page.locator('video[aria-label="Reference"]').getAttribute('title'),'Loop & title');
      assert.ok(await page.locator('video[aria-label="Reference"]').evaluate(v=>v.paused&&!v.closest('a')));
      await clickVideo(page,'video[aria-label="Reference"]',true);
      await playing(page,'video[aria-label="Reference"]');
      assert.equal(new URL(page.url()).hash,'#/projects/vivarium','linked video does not navigate its parent link');
      assert.equal(await page.locator('video[aria-label="Reference"]').evaluate(v=>v.videoWidth),160);
      assert.equal(await page.locator('.content code').textContent(),'![Literal](assets/example.mp4)');
      assert.equal(await page.getByRole('link',{name:'Download',exact:true}).count(),1);
      assert.equal(await page.locator('.pdf-embed').count(),1);
      assert.equal(await page.locator('.image-viewer').count(),1);
      await page.locator('.image-viewer').click();
      await page.waitForSelector('.pswp--open');
      await page.waitForFunction(()=>viewer.opener.isOpen);
      assert.equal(await page.evaluate(()=>viewer.options.dataSource.length),1,'only images enter the lightbox');
      await page.keyboard.press('Escape');
      await page.waitForSelector('.pswp',{state:'detached'});
      await page.locator('.pdf-embed').scrollIntoViewIfNeeded();
      await page.locator('.pdf-page[data-rendered] canvas').first().waitFor();
      await context.close();
    }
    // The existing GIF poster/play controls still use the image viewer path.
    for(const width of [1440,375]){
    const {context,page}=await setup(width,'/personal/');
    await page.evaluate(()=>location.hash='#/projects/zion');
    await page.waitForFunction(()=>document.querySelector('.content').dataset.pageId==='projects-zion');
    const animation=page.locator('.animation-preview').first();
    const gifButton=animation.locator('.animation-control');
    assert.deepEqual(await appearance(gifButton),videoControls[width].paused,'GIF and video paused controls are identical');
    const poster=await animation.locator('img').getAttribute('src');
    if(width<900)await gifButton.tap();else await gifButton.click();
    assert.ok(await animation.evaluate(el=>el.classList.contains('is-playing')));
    assert.ok(await animation.locator('img').evaluate(img=>img.src.endsWith('.gif')));
    assert.equal(await page.locator('video.embedded-video').count(),0);
    await page.mouse.move(0,899);
    assert.deepEqual(await appearance(gifButton),videoControls[width].playing,'GIF and video playing controls are identical');
    await gifButton.focus();await page.keyboard.press('Space');
    assert.equal(await animation.locator('img').getAttribute('src'),poster,'GIF pause still restores its poster');
    await page.keyboard.press('Enter');
    assert.ok(await animation.evaluate(el=>el.classList.contains('is-playing')));
    await gifButton.click();
    if(width===1440){
      await gifButton.hover();
      assert.equal(await gifButton.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(74, 68, 64)');
    }
    await animation.locator('.image-viewer').click({position:{x:20,y:20}});
    await page.waitForFunction(()=>viewer?.opener.isOpen);
    await page.keyboard.press('Escape');
    await page.waitForSelector('.pswp',{state:'detached'});
    await context.close();
    }
    assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
    fs.writeFileSync('.test-results/videos/report.json',JSON.stringify(results,null,2));
    console.log('PASS shared GIF/video controls, paused initial state, mouse/touch/keyboard pause-resume, preserved frames, looping, visibility/manual-pause state, parent-click isolation and both views at 1440/375/320px; WebM, galleries, GIFs, PDFs and image viewer preserved.');
  }finally{await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
