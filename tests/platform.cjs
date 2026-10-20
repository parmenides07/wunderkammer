const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.SITE_URL||'http://127.0.0.1:5173';
const output='.test-results/platform';
const text='.content-text p,.content-text li,.content-text h2,.doc-dates,.content-text a,.card-section-header,.card a,.receipt-header,.receipt-divider,.receipt-total,.card-file-links a';
const artwork='.card,.receipt,.cardicon2,.tuck-btn,.content-bg,.leftbg,.leftbg img,.leftbgblur,.banner,.content img,.material,.wrapper';
async function styles(page,selector){
  return page.locator(selector).evaluateAll(elements=>elements.map(el=>{
    const c=getComputedStyle(el),r=el.getBoundingClientRect();
    return {tag:el.tagName,class:el.className,x:r.x,y:r.y,w:r.width,h:r.height,
      ...Object.fromEntries(['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','color','opacity','mixBlendMode','transform','filter','textShadow','boxShadow','backgroundImage','backgroundSize','backgroundPosition'].map(k=>[k,c[k]]))};
  }));
}
async function run(){
  fs.mkdirSync(output,{recursive:true});
  const results=[],errors=[];
  const engines=[['chromium',chromium,{executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']}]];
  if(fs.existsSync(webkit.executablePath()))engines.push(['webkit',webkit,{}]);
  else results.push({engine:'webkit',unavailable:'WebKit test browser is not installed'});
  for(const [name,engine,options] of engines){
    let browser;
    try{browser=await engine.launch(options);}
    catch(error){if(name!=='webkit')throw error;results.push({engine:name,unavailable:error.message});continue;}
    try{
      for(const [width,dpr] of name==='chromium'?[[1440,1],[1440,2],[1920,2],[390,2],[430,2]]:[[1440,2],[390,2]]){
        const mobile=width<900;
        const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:dpr,isMobile:mobile,hasTouch:mobile});
        await context.addInitScript(({mobile})=>{
          Object.defineProperties(navigator,{
            platform:{configurable:true,value:mobile?'iPhone':'MacIntel'},
            userAgentData:{configurable:true,value:undefined},
            userAgent:{configurable:true,value:mobile?'iPhone; CPU iPhone OS like Mac OS X Mobile':'Macintosh; Intel Mac OS X 10_15_7'},
            maxTouchPoints:{configurable:true,value:mobile?5:0}
          });
        },{mobile});
        const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
        await page.goto(base+'/personal/#/projects/zion');
        await page.waitForFunction(()=>document.querySelector('.content').dataset.pageId==='projects-zion');
        await page.evaluate(()=>document.fonts.ready);
        await page.waitForTimeout(400);
        assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('platform-macos')),!mobile);
        const sharpText=await styles(page,text),sharpArt=await styles(page,artwork);
        const geometry=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,articleOverflow:document.querySelector('.content').scrollWidth>document.querySelector('.content').clientWidth+1}));
        assert.deepEqual(geometry,{overflow:false,articleOverflow:false});
        await page.screenshot({path:`${output}/${name}-${width}-dpr${dpr}-mac.png`});
        await page.evaluate(()=>document.documentElement.classList.remove('platform-macos'));
        // Navigation links have an existing transition: allow it to settle.
        await page.waitForTimeout(250);
        const originalText=await styles(page,text),originalArt=await styles(page,artwork);
        assert.deepEqual(sharpArt,originalArt,'artwork, paper filters, shadows and geometry are unchanged');
        for(let i=0;i<sharpText.length;i++){
          const {filter:macFilter,textShadow:macShadow,...mac}=sharpText[i];
          const {filter,textShadow,...original}=originalText[i];
          assert.deepEqual(mac,original,'font metrics, colors, opacity, blending and geometry stay unchanged');
          if(mobile)assert.deepEqual(sharpText[i],originalText[i],'mobile typography is unchanged');
          else if(filter!=='none'||textShadow!=='none'){
            assert.equal(macFilter,'none');assert.equal(macShadow,'none');
          }
        }
        if(!mobile)assert.ok(originalText.some(e=>e.filter.includes('blur(')),'desktop ink still exists without the macOS class');
        await page.screenshot({path:`${output}/${name}-${width}-dpr${dpr}-original.png`});
        results.push({engine:name,width,dpr,textElements:sharpText.length,artworkElements:sharpArt.length,geometry});
        await context.close();
      }
      for(const sample of [
        {label:'macOS Chrome client hints',platform:'MacIntel',hint:'macOS',ua:'Macintosh Chrome/140',touch:0,expected:true},
        {label:'macOS Firefox',platform:'MacIntel',ua:'Macintosh Firefox/140',touch:0,expected:true},
        {label:'Windows',platform:'Win32',hint:'Windows',ua:'Windows NT 10.0',touch:0,expected:false},
        {label:'Linux',platform:'Linux x86_64',hint:'Linux',ua:'X11; Linux x86_64',touch:0,expected:false},
        {label:'iPad desktop UA',platform:'MacIntel',ua:'Macintosh; Intel Mac OS X 10_15 Version/18 Safari/605',touch:5,expected:false},
        {label:'iPad mobile UA',platform:'iPad',ua:'iPad; CPU OS like Mac OS X Mobile',touch:5,expected:false}
      ]){
        const context=await browser.newContext({viewport:{width:1440,height:900}});
        await context.addInitScript(sample=>Object.defineProperties(navigator,{
          platform:{value:sample.platform},userAgent:{value:sample.ua},
          userAgentData:{value:sample.hint?{platform:sample.hint,mobile:false}:undefined},
          maxTouchPoints:{value:sample.touch}
        }),sample);
        const page=await context.newPage();
        await page.goto(base+'/',{waitUntil:'domcontentloaded'});
        assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('platform-macos')),sample.expected,sample.label);
        results.push({engine:name,detection:sample.label,passed:true});
        await context.close();
      }
    }finally{await browser.close();}
  }
  assert.deepEqual(errors,[]);
  fs.writeFileSync(output+'/results.json',JSON.stringify({results,errors},null,2));
  console.log(JSON.stringify({results,errors}));
}
module.exports=run;
if(require.main===module)run().catch(error=>{console.error(error);process.exitCode=1;});
