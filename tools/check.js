const {markdownReferences}=require('./markdown');
const fs=require('node:fs');
const path=require('node:path');
const {build,buildManifest}=require('../build');
function checkContent(root) {
 const manifest=buildManifest(root),errors=[],warnings=[];
 const slugs=new Set(manifest.pages.map(p=>p.slug));
 const report=(list,page,message)=>list.push(`${page.authorSource}: ${message}`);
 const imageIndex=JSON.parse(fs.readFileSync(path.join(root,'generated/image-index.json')));
 for(const page of manifest.pages) {
  const refs=[page.banner,page.sound];
  const markdown=markdownReferences(page.body);
  for(const image of markdown.images) {
    refs.push(image.href);
    if(image.alt.startsWith('sound:'))refs.push(image.alt.slice(6));
    if(!image.alt.trim()||/^(?:(?:image|img|album|jef|tob|th|gar)\d*|sound:.*)$/i.test(image.alt))report(warnings,page,`Image needs useful alt text: ${image.href}`);
  }
  for(const m of page.body.matchAll(/(?:images|embed)\{([^}]+)\}/g))refs.push(m[1].split(',')[0].trim());
  for(const m of page.body.matchAll(/(?:src|poster)=["']([^"']+)["']/g))refs.push(m[1]);
  for(const ref of refs.filter(Boolean)) {
    if(/^(?:https?:|data:)/.test(ref))continue;
    const source=path.posix.normalize(`${page.assetBase}/${ref.split('#')[0]}`);
    if(!fs.existsSync(path.join(root,source)))report(errors,page,`Missing local asset: ${ref}`);
    const info=imageIndex[source];
    if(info) {
      const display=info.variants.filter(v=>v.width<=2000);
      if(display.some(v=>v.bytes>1200000))report(warnings,page,`Large display image (${Math.round(Math.max(...display.map(v=>v.bytes))/1024)} KB): ${ref}`);
    }
  }
  for(const href of markdown.links) {
    if(href.startsWith('#/')&&!slugs.has(href.slice(2))&&!href.startsWith('#/browse/'))report(errors,page,`Unknown route: ${href}`);
    else if(/parmenides07\.github\.io\/wunderkammer/.test(href))report(warnings,page,`Legacy link needs review: ${href}`);
    else if(!/^(?:[a-z]+:|#|\/)/i.test(href)&&!fs.existsSync(path.resolve(root,page.assetBase,href)))report(errors,page,`Missing relative link: ${href}`);
  }
  if(!fs.existsSync(path.join(root,page.source)))report(errors,page,`Missing generated page: ${page.source}`);
 }
 return {errors,warnings};
}
async function main() {
 const root=path.resolve(__dirname,'..');await build(root);const {errors,warnings}=checkContent(root);
 errors.push(...require('./views-check').checkViews(root));
 warnings.push(...require('./assets').auditAssets(root));
 for(const warning of warnings)console.warn(`WARN ${warning}`);
 for(const error of errors)console.error(`ERROR ${error}`);
 console.log(`Check: ${errors.length} errors, ${warnings.length} authoring warnings. No deployment performed.`);
 if(errors.length)process.exitCode=1;
}
if(require.main===module)main().catch(e=>{console.error(`ERROR ${e.message}`);process.exitCode=1;});
module.exports={checkContent};
