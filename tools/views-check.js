const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createContentModel}=require('../js/content');
const {createNavigation,receiptSelection}=require('../js/navigation');
const views=require('../js/views');
function checkViews(root){
 const errors=[],expect=(condition,message)=>{if(!condition)errors.push(`Views: ${message}`);};
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'))),config=JSON.parse(fs.readFileSync(path.join(root,'site.config.json')));
 for(const [entry,audience] of [['/','professional'],['/personal/','public']]){
  expect(views.audience(entry)===audience,`${entry} mode is incorrect`);
  const model=createContentModel(manifest,audience),nav=createNavigation(model,config,audience);
  for(const page of model.pages){expect(model.resolve(page.slug)?.id===page.id,`${entry} route ${page.slug} does not resolve`);expect(nav.pageGroups.has(page.id),`${entry} missing container for ${page.id}`);expect(views.routeHref(entry,'',page.slug)===`${entry}#/${page.slug}`,`${entry} route escapes shell`);}
  for(const node of nav.catalog.values()){
   const state=receiptSelection({},node,node.pages[0]);
   expect(state.directLeafPages.every(p=>p.published&&p.audience.includes(audience)&&nav.pageGroups.get(p.id)===node),`${entry} invalid direct leaf in ${node.key}`);
   expect(state.receiptEligible===(node.pages.length>=2)&&state.receiptTucked===(node.pages.length<2),`${entry} wrong receipt count in ${node.key}`);
  }
 }
 for(const page of manifest.pages.filter(p=>p.published&&p.audience.includes('public')&&!p.audience.includes('professional'))){expect(views.personalFallback(manifest,page.slug)===page.slug,`missing personal fallback ${page.slug}`);for(const [alias,slug] of Object.entries(manifest.aliases))if(slug===page.slug)expect(views.personalFallback(manifest,alias)===slug,`missing legacy fallback ${alias}`);}
 expect(views.personalFallback(manifest,'nonexistent-route')===null,'unknown route should remain a 404');
 const rootShell=fs.readFileSync(path.join(root,'index.html'),'utf8'),personal=fs.readFileSync(path.join(root,'personal/index.html'),'utf8'),alias=fs.readFileSync(path.join(root,'work/index.html'),'utf8');
 expect(!rootShell.includes('noindex'),'root must remain indexable');
 expect(personal.includes('<base href="../">'),'personal assets require shared base');
 expect(personal.includes('name="robots" content="noindex,follow"')===!!config.views?.personal?.noindex,'personal robots setting mismatch');
 for(const html of [rootShell,personal])expect(html.includes('src="js/views.js"'),'entry shell missing view resolver');
 const redirect=alias.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 expect(!!redirect,'work redirect missing');
 if(redirect)for(const entry of ['work/','work/index.html']){let destination;const location={href:`https://example.test/site/${entry}?from=cv#/projects/akashom`,search:'?from=cv',hash:'#/projects/akashom',replace:value=>destination=value};vm.runInNewContext(redirect,{URL,location});expect(destination==='https://example.test/site/?from=cv#/projects/akashom','work alias loses route/query or base path');}
 return errors;
}
module.exports={checkViews};
