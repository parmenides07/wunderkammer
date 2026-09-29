const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || '/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});const results=[];
 for(const spec of [{name:'home-cold',route:'home'},{name:'darkroom-cold',route:'projects/darkroom'},{name:'mobile-home-cold',route:'home',mobile:true}]){
  const context=await browser.newContext({viewport:spec.mobile?{width:375,height:812}:{width:1440,height:1000},isMobile:!!spec.mobile,hasTouch:!!spec.mobile,deviceScaleFactor:spec.mobile?2:1});const page=await context.newPage();
  await page.addInitScript(()=>{window.lcp=[];new PerformanceObserver(list=>window.lcp.push(...list.getEntries().map(e=>({time:e.startTime,size:e.size,url:e.url,element:e.element?.className})))).observe({type:'largest-contentful-paint',buffered:true});});
  const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');let requests=new Map();
  cdp.on('Network.responseReceived',e=>requests.set(e.requestId,{url:e.response.url,type:e.type,status:e.response.status,bytes:0,cache:e.response.fromDiskCache}));
  cdp.on('Network.loadingFinished',e=>{if(requests.has(e.requestId))requests.get(e.requestId).bytes=e.encodedDataLength;});
  async function measure(name,reload=false){requests.clear();const start=Date.now();if(reload)await page.reload({waitUntil:'load',timeout:120000});else await page.goto((process.env.SITE_URL || 'http://127.0.0.1:5173')+'/#/'+spec.route,{waitUntil:'load',timeout:120000});await page.waitForFunction(()=>document.querySelector('.content').dataset.pageId,{timeout:120000});await page.waitForTimeout(4000);
   const data=await page.evaluate(()=>({lcp:window.lcp.at(-1),paint:performance.getEntriesByType('paint').map(x=>({name:x.name,time:x.startTime})),navigation:performance.getEntriesByType('navigation').map(n=>({dcl:n.domContentLoadedEventEnd,load:n.loadEventEnd})),resources:performance.getEntriesByType('resource').map(r=>({name:r.name,duration:r.duration,transfer:r.transferSize,blocking:r.renderBlockingStatus})),images:[...document.images].map(i=>({src:i.currentSrc,width:i.naturalWidth,height:i.naturalHeight,visible:!!i.getClientRects().length,lazy:i.loading}))}));
   const all=[...requests.values()],r={name,elapsed:Date.now()-start,total:all.reduce((n,r)=>n+r.bytes,0),requests:all.sort((a,b)=>b.bytes-a.bytes),...data};results.push(r);console.log(JSON.stringify({name,total:r.total,lcp:r.lcp,largest:r.requests.slice(0,10)}));
   await page.screenshot({path:'/tmp/'+process.argv[2]+'-'+name+'.png'});
  }
  await measure(spec.name);if(spec.name==='home-cold')await measure('home-repeat',true);await context.close();
 }
 fs.mkdirSync('.test-results',{recursive:true});fs.writeFileSync('.test-results/performance-'+(process.argv[2]||'current')+'.json',JSON.stringify(results,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
