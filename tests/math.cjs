const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.SITE_URL||'http://127.0.0.1:5173';
const manifest=require('../manifest.json');
const source=fs.readFileSync(path.join(__dirname,'../content/projects/vivarium/index.md'),'utf8');
const equations=[...source.matchAll(/^\$\$\n([\s\S]*?)\n\$\$/gm)].map(m=>m[1]);
const archive=manifest.pages.find(p=>p.slug==='archive/experiments/proof-of-concept');
const extra=String.raw`

Inline ($n_i$) and $\alpha$; literal code: `+'`$n_i$`'+String.raw`.

$$
\begin{aligned}
f(n)&=g(n)+h(n)\\
\mu&=\frac{1}{N}\sum_{i=1}^{N}\alpha_i
\end{aligned}
$$
`;

async function run(){
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
  const errors=[],failures=[],results=[];
  fs.mkdirSync('.test-results/math',{recursive:true});
  try{
    for(const shell of ['/','/personal/'])for(const width of [1440,375,320]){
      const mobile=width<900;
      const context=await browser.newContext({viewport:{width,height:900},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1});
      const page=await context.newPage();
      page.on('pageerror',e=>errors.push(e.message));
      page.on('response',r=>{if(/\/generated\/vendor\/(?:katex|marked-katex|fonts\/)/.test(r.url())&&r.status()>=400)failures.push(r.url());});
      await page.goto(`${base}${shell}#/projects/vivarium`);
      await page.waitForFunction(()=>document.querySelector('.content').dataset.pageId==='projects-vivarium');
      await page.evaluate(()=>document.fonts.ready);
      assert.equal(await page.locator('.content .katex').count(),23);
      assert.equal(await page.locator('.katex-error').count(),0);
      assert.deepEqual(await page.locator('.katex-display annotation').allTextContents(),equations);
      assert.ok(await page.locator('.content .katex-mathml').count(),'accessible MathML');
      const metrics=await page.evaluate(()=>({
        viewport:innerWidth,document:document.documentElement.scrollWidth,
        articleWidth:document.querySelector('.content').clientWidth,articleScroll:document.querySelector('.content').scrollWidth,
        loadedFonts:[...document.fonts].filter(f=>f.family.startsWith('KaTeX')&&f.status==='loaded').length,
        blocks:[...document.querySelectorAll('.katex-display')].map(el=>({
          width:el.clientWidth,scroll:el.scrollWidth,column:el.parentElement.clientWidth,
          start:el.firstElementChild.getBoundingClientRect().left-el.getBoundingClientRect().left,
          overflow:getComputedStyle(el).overflowX,color:getComputedStyle(el).color,
          articleColor:getComputedStyle(document.querySelector('.content')).color
        }))
      }));
      assert.equal(metrics.document,metrics.viewport);
      assert.ok(metrics.articleScroll<=metrics.articleWidth+1,'no article overflow');
      assert.ok(metrics.loadedFonts>=3,'local KaTeX fonts loaded');
      for(const block of metrics.blocks){
        assert.ok(block.width<=block.column+1,'equation stays in its reading column');
        assert.ok(Math.abs(block.start)<1,'wide equation starts at a reachable left edge');
        assert.equal(block.overflow,'auto');
        assert.equal(block.color,block.articleColor);
      }
      if(mobile){
        assert.ok(metrics.blocks.some(b=>b.scroll>b.width),'long equations scroll on narrow screens');
        const long=page.locator('.katex-display').nth(3);
        await long.evaluate(el=>el.scrollLeft=el.scrollWidth);
        assert.ok(await long.evaluate(el=>Math.abs(el.scrollLeft+el.clientWidth-el.scrollWidth)<=1),'right edge is reachable');
        await long.evaluate(el=>el.scrollLeft=0);
        await long.focus();
        await page.keyboard.press('ArrowRight');
        await page.waitForFunction(()=>document.querySelectorAll('.katex-display')[3].scrollLeft>0);
      }
      if(shell==='/'&&width!==320){
        for(const [index,name] of [[0,'state-transition'],[2,'astar'],[4,'interpolation']]){
          await page.locator('.katex-display').nth(index).evaluate(el=>{
            el.scrollLeft=0;
            const article=document.querySelector('.content'),top=el.getBoundingClientRect().top;
            if(matchMedia('(max-width: 900px), (pointer: coarse)').matches)window.scrollBy(0,top-220);
            else article.scrollTop+=top-article.getBoundingClientRect().top-220;
          });
          await page.screenshot({path:`.test-results/math/vivarium-${width}-${name}.png`});
        }
      }
      // Exercise an archive through the same real rendering/media pipeline.
      // Overlay test Markdown in the browser; authored content is never edited.
      if(shell==='/personal/'){
        await page.route(`**/${archive.source}`,async route=>{
          const response=await route.fetch();
          await route.fulfill({response,body:await response.text()+extra});
        });
        await page.evaluate(slug=>location.hash=`#/${slug}`,archive.slug);
        await page.waitForFunction(id=>document.querySelector('.content').dataset.pageId===id,archive.id);
        assert.equal(await page.locator('.katex-display').count(),1);
        assert.equal(await page.locator('.katex-error').count(),0);
        assert.ok(await page.locator('.katex mfrac').count());
        assert.ok(await page.locator('.katex mtable').count());
        assert.equal(await page.locator('.content code').last().textContent(),'$n_i$');
        assert.ok(await page.locator('.csv-table tbody tr').count(),'CSV media preserved');
        assert.ok(await page.locator('.multiply-wrapper').count(),'image handling preserved');
      }
      await page.evaluate(()=>location.hash='#/about');
      await page.waitForFunction(id=>document.querySelector('.content').dataset.pageId===id,shell==='/personal/'?'about':'about-professional');
      assert.equal(await page.locator('.katex').count(),0,'no stale math after navigation');
      await page.goBack();
      await page.waitForFunction(id=>document.querySelector('.content').dataset.pageId===id,shell==='/personal/'?archive.id:'projects-vivarium');
      results.push({shell,width,mathCount:23,displayCount:5,...metrics});
      await context.close();
    }
    assert.deepEqual(errors,[]);
    assert.deepEqual(failures,[]);
    fs.writeFileSync('.test-results/math/report.json',JSON.stringify(results,null,2));
    console.log('Math verified: Vivarium in both views at 1440, 375 and 320px; local fonts, all equations, bounded scrolling, archives, media and navigation.');
  }finally{await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
