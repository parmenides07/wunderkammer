const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {project}=require('./fixtures/pdf/project.cjs');
const devBase=process.env.SITE_URL||'http://127.0.0.1:5173';
async function run(){
  const fixture=await project();
  const manifest=structuredClone(require('../manifest.json'));
  manifest.pages.push(...fixture.manifest.pages.map(({body,...page})=>({...page,images:`generated/images/${page.id}.json`})));
  Object.assign(manifest.assetDirectories,fixture.manifest.assetDirectories);
  // Serve the temporary project over real HTTP: browser-native PDF tabs and
  // downloads bypass Playwright's page request interception in some browsers.
  const server=http.createServer(async(req,res)=>{
    const pathname=decodeURIComponent(new URL(req.url,devBase).pathname).slice(1);
    let bytes,type='application/json';
    if(pathname==='manifest.json')bytes=Buffer.from(JSON.stringify(manifest));
    const entry=fixture.manifest.pages.find(p=>p.source===pathname);
    if(entry){bytes=Buffer.from(entry.body);type='text/plain';}
    if(/^generated\/images\/pdf-/.test(pathname))bytes=Buffer.from('{}');
    if(pathname.startsWith('content/projects/pdf-fixture/')||pathname.startsWith('generated/documents/pdf-')){
      const file=path.join(fixture.root,pathname);
      if(!fs.existsSync(file)){res.writeHead(404);res.end('File not found');return;}
      bytes=fs.readFileSync(file);type=/\.pdf$/i.test(file)?'application/pdf':file.endsWith('.svg')?'image/svg+xml':type;
      if(pathname.endsWith('mathematical model.PDF'))await new Promise(resolve=>setTimeout(resolve,350));
    }
    if(bytes){
      const headers={'Content-Type':type,'Content-Length':bytes.length,'Accept-Ranges':'bytes'};
      const range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');
      if(range){const start=Number(range[1]),end=Math.min(Number(range[2]||bytes.length-1),bytes.length-1);res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${bytes.length}`,'Content-Length':end-start+1});res.end(bytes.subarray(start,end+1));}
      else{res.writeHead(200,headers);res.end(bytes);}
      return;
    }
    // Keep test pages stable while a separate authoring session rebuilds.
    if(pathname==='__events'){res.writeHead(200,{'Content-Type':'text/event-stream'});res.end();return;}
    const upstream=http.request(new URL(req.url,devBase),{method:req.method,headers:req.headers},response=>{res.writeHead(response.statusCode,response.headers);response.pipe(res);});
    upstream.on('error',()=>{res.writeHead(502);res.end();});req.pipe(upstream);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
  const results=[],errors=[];fs.mkdirSync('.test-results/pdf',{recursive:true});
  async function setup(width,shell){
    const mobile=width<900;
    const context=await browser.newContext({viewport:{width,height:900},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:2});
    const page=await context.newPage(),requests=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('request',request=>requests.push(request.url()));
    await page.addInitScript(()=>{
      window.pdfWorkers=new Set();const NativeWorker=window.Worker;
      window.Worker=class extends NativeWorker{
        constructor(...args){super(...args);window.pdfWorkers.add(this);}
        terminate(){window.pdfWorkers.delete(this);return super.terminate();}
      };
    });
    await page.goto(`${base}${shell}#/home`);
    await page.waitForFunction(()=>document.querySelector('.content')?.dataset.pageId);
    assert.equal(requests.some(url=>/pdf-viewer\.mjs|vendor\/pdfjs/.test(url)),false,'PDF.js absent without embeds');
    async function go(key){
      await page.evaluate(key=>location.hash=`#/projects/pdf-fixture/${key}`,key);
      await page.waitForFunction(key=>document.querySelector('.content').dataset.pageId===`pdf-${key}`,key);
    }
    async function rendered(number){
      try{await page.locator(`.pdf-page[data-page="${number}"][data-rendered] .textLayer span`).first().waitFor();}
      catch(error){
        console.error(await page.evaluate(()=>({url:location.href,status:document.querySelector('.pdf-status')?.textContent,scroll:scrollY,article:document.querySelector('.content').scrollTop,workers:pdfWorkers.size,pages:[...document.querySelector('.pdf-pages')?.shadowRoot.querySelectorAll('.pdf-page')||[]].slice(0,2).map(el=>({html:el.innerHTML.slice(0,500),box:el.getBoundingClientRect().toJSON()}))})));
        await page.screenshot({path:'.test-results/pdf/failure.png'});throw error;
      }
    }
    return {context,page,requests,mobile,go,rendered};
  }
  try{
    // Real dev server MIME, original bytes, uppercase extension, and range support.
    const original=fs.readFileSync(path.join(__dirname,'fixtures/pdf/mathematical model.PDF'));
    const response=await fetch(`${base}/tests/fixtures/pdf/mathematical%20model.PDF`);
    assert.match(response.headers.get('content-type'),/application\/pdf/);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()),original);
    const range=await fetch(`${base}/tests/fixtures/pdf/mathematical%20model.PDF`,{headers:{Range:'bytes=0-99'}});
    assert.equal(range.status,206);assert.deepEqual(Buffer.from(await range.arrayBuffer()),original.subarray(0,100));
    for(const shell of ['/','/personal/'])for(const width of [390,1440,2560]){
      console.log(`PDF ${shell} at ${width}px`);
      const {context,page,requests,mobile,go,rendered}=await setup(width,shell);
      await go('deferred');
      await page.waitForTimeout(250);
      assert.equal(requests.some(url=>/pdf-viewer\.mjs|vendor\/pdfjs/.test(url)),false,'offscreen embed defers PDF.js');
      assert.equal(await page.locator('.pdf-page').count(),1,'page space reserved before library loads');
      const origin=await page.evaluate(()=>performance.timeOrigin);
      await go('ten');await rendered(1);
      assert.equal(await page.evaluate(()=>performance.timeOrigin),origin,'in-view navigation has no reload');
      assert.equal(await page.locator('.pdf-embed').getAttribute('aria-label'),'Mathematical model');
      assert.equal(await page.locator('img[src$=".PDF"]').count(),0);
      assert.equal(await page.locator('.pdf-page').count(),10);
      const boxes=await page.locator('.pdf-page').evaluateAll(elements=>elements.map(el=>({number:Number(el.dataset.page),width:el.clientWidth,height:el.clientHeight,top:el.getBoundingClientRect().top})));
      assert.deepEqual(boxes.map(p=>p.number),Array.from({length:10},(_,i)=>i+1));
      for(let n=0;n<boxes.length;n++){
        const ratio=n===2?792/612:n===3?1:612/792;
        assert.ok(Math.abs(boxes[n].width/boxes[n].height-ratio)<.01);
        if(n)assert.ok(boxes[n].top>boxes[n-1].top+boxes[n-1].height,'vertical page separation');
      }
      assert.ok(await page.locator('.pdf-page canvas').count()<10,'no eager full document render');
      const canvas=page.locator('.pdf-page canvas').first();
      assert.ok(await canvas.evaluate(el=>el.width>el.clientWidth*1.4),'sharp at DPR 2');
      assert.ok(await canvas.evaluate(el=>{const data=el.getContext('2d').getImageData(0,0,el.width,el.height).data;let ink=0;for(let n=0;n<data.length;n+=4)if(data[n]<180)ink++;return ink>1000;}),'real nonblank rendering');
      const selected=await page.locator('.textLayer span').first().evaluate(el=>{
        const range=document.createRange();range.selectNodeContents(el);const selection=el.getRootNode().getSelection();selection.removeAllRanges();selection.addRange(range);const text=selection.toString();selection.removeAllRanges();return text;
      });
      assert.match(selected,/Mathematical/);
      await page.locator('.pdf-open').focus();
      assert.notEqual(await page.locator('.pdf-open').evaluate(el=>getComputedStyle(el).outlineStyle),'none');
      await page.screenshot({path:`.test-results/pdf/${shell==='/'?'root':'personal'}-${width}.png`});
      const url=await page.locator('.pdf-open').getAttribute('href');
      assert.equal(new URL(url).pathname,'/content/projects/pdf-fixture/assets/mathematical%20model.PDF');
      assert.equal(await page.locator('.pdf-download').getAttribute('href'),url);
      assert.equal(await page.getByRole('link',{name:'Download paper',exact:true}).getAttribute('href'),url);
      assert.equal(await page.locator('.image-viewer img').getAttribute('alt'),'Diagram');
      if(width===1440&&shell==='/'){
        const [download]=await Promise.all([page.waitForEvent('download'),page.locator('.pdf-download').click()]);
        assert.deepEqual(fs.readFileSync(await download.path()),original);
        const [popup]=await Promise.all([page.waitForEvent('popup'),page.locator('.pdf-open').click()]);
        await popup.waitForURL(url);await popup.close();
      }
      await go('long');await rendered(1);
      await page.locator('.pdf-page[data-page="25"]').scrollIntoViewIfNeeded();await rendered(25);
      await page.waitForFunction(()=>document.querySelector('.pdf-count').textContent==='25 / 40');
      await page.waitForTimeout(200);
      assert.ok(await page.locator('.pdf-page canvas').count()<=6,'bounded canvases after long scroll');
      assert.equal(await page.locator('.pdf-page[data-page="1"] canvas').count(),0,'distant canvas released');
      assert.ok(await page.locator('.textLayer').count()<=6,'distant text released');
      assert.equal(await page.locator('.pdf-embed').evaluate(el=>getComputedStyle(el).overflowY),'visible');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
      if(mobile){
        const before=await page.evaluate(()=>scrollY);
        const cdp=await context.newCDPSession(page);
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:220,y:650}]});
        for(const y of [600,540,480,420,350])await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:220,y}]});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        await page.waitForFunction(before=>scrollY>before,before);
        assert.equal(await page.locator('#index-toggle').getAttribute('aria-expanded'),'false');
        await page.waitForTimeout(400);
        await page.locator('#index-toggle').click();assert.equal(await page.locator('.material').getAttribute('inert'),'');
        const offset=await page.evaluate(()=>readingPosition.y);
        await page.locator('#index-close').click();
        const restored=await page.evaluate(()=>scrollY);
        assert.ok(Math.abs(restored-offset)<3,`INDEX restores ${offset}, got ${restored}`);
      }else{
        await page.setViewportSize({width:width-250,height:800});
        await page.locator('.pdf-page[data-page="25"]').scrollIntoViewIfNeeded();await rendered(25);
        await page.waitForTimeout(300);
        const geometry=await page.locator('.pdf-page[data-page="25"] canvas').evaluate(el=>({pixels:el.width,width:el.clientWidth,height:el.clientHeight}));
        const density=Math.min(2,Math.sqrt(4_000_000/(geometry.width*geometry.height)));
        assert.ok(Math.abs(geometry.pixels/geometry.width-density)<.03);
        assert.ok(Math.abs(geometry.width/geometry.height-612/792)<.01);
        if(width===1440){
          await page.setViewportSize({width:800,height:900});
          await page.locator('.pdf-page[data-page="25"]').scrollIntoViewIfNeeded();await rendered(25);
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),800);
          assert.ok(await page.evaluate(()=>scrollY)>0,'resize switches to mobile document scrolling');
          await page.setViewportSize({width,height:900});
          await page.locator('.pdf-page[data-page="25"]').scrollIntoViewIfNeeded();await rendered(25);
        }
      }
      await page.evaluate(()=>window.oldPDFCanvases=[...document.querySelector('.pdf-pages').shadowRoot.querySelectorAll('canvas')]);
      await page.evaluate(()=>location.hash='#/home');
      await page.waitForFunction(()=>document.querySelector('.content').dataset.pageId.startsWith('home'));
      await page.waitForFunction(()=>pdfWorkers.size===0&&oldPDFCanvases.every(canvas=>canvas.width===0&&canvas.height===0));
      await go('one');await rendered(1);assert.equal(await page.locator('.pdf-count').textContent(),'1 / 1');
      await go('encoded');await rendered(1);assert.match(await page.locator('.pdf-open').getAttribute('href'),/research%20%23%20%CE%B1.PDF/);
      for(const key of ['malformed','missing']){
        await go(key);await page.getByRole('status').filter({hasText:'PDF preview unavailable'}).waitFor();
        assert.ok(await page.locator('.pdf-open').getAttribute('href'));
        if(key==='malformed')assert.equal(await page.locator('.image-viewer img').count(),1);
      }
      // A pending import/fetch/render must not resurrect a viewer after routing.
      await go('long');await page.evaluate(()=>location.hash='#/home');
      await page.waitForFunction(()=>document.querySelector('.content').dataset.pageId.startsWith('home'));
      await page.waitForFunction(()=>pdfWorkers.size===0);
      assert.equal(await page.locator('.pdf-embed').count(),0);
      results.push({shell,width,passed:true});await context.close();
    }
    const failure=await setup(390,'/');
    await failure.context.route('**/js/pdf-viewer.mjs',route=>route.abort());
    await failure.go('one');
    await failure.page.getByRole('status').filter({hasText:'PDF preview unavailable'}).waitFor();
    assert.equal(await failure.page.locator('.pdf-page').count(),0,'failed library leaves a compact fallback');
    assert.ok(await failure.page.locator('.pdf-open').getAttribute('href'));
    await failure.context.close();
    for(const width of [390,1440]){
      const normal=await setup(width,'/personal/'),{page,context,requests}=normal;
      await page.evaluate(()=>location.hash='#/projects/darkroom');
      await page.waitForFunction(()=>document.querySelector('.content').dataset.pageId==='projects-darkroom');
      const link=page.locator('.image-viewer').first();await link.scrollIntoViewIfNeeded();
      assert.ok(await link.locator('img').getAttribute('srcset'),'normal images still have responsive variants');
      await link.focus();await page.keyboard.press('Enter');
      await page.waitForFunction(()=>viewer?.opener.isOpen);
      if(width===390){
        const cdp=await context.newCDPSession(page);
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:330,y:400}]});
        for(const x of [290,250,200,150,100,50])await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:400}]});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      }else await page.keyboard.press('ArrowRight');
      await page.waitForFunction(()=>viewer.currIndex===1);
      await page.keyboard.press('Escape');await page.waitForSelector('.pswp',{state:'detached'});
      assert.equal(await page.evaluate(()=>readingLocks.size),0);
      assert.equal(requests.some(url=>/pdf-viewer\.mjs|vendor\/pdfjs/.test(url)),false,'normal gallery never loads PDF.js');
      await context.close();
    }
    assert.deepEqual(errors,[]);
    fs.writeFileSync('.test-results/pdf/results.json',JSON.stringify({results,errors},null,2));
    console.log('PASS PDF authoring, original assets, text selection, lazy rendering, bounded memory, cleanup, errors, resize, touch/INDEX in both views at 390/1440/2560px');
  }finally{await browser.close();server.closeAllConnections();server.close();fixture.close();}
}
if(require.main===module)run().catch(error=>{console.error(error);process.exitCode=1;});
module.exports=run;
