const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),matter=require('gray-matter');
const {buildManifest}=require('../../../build');
const {buildDocuments}=require('../../../tools/documents');
const bodies={
  ten:'An inline mathematical document.\n\n![Mathematical model](<assets/mathematical model.PDF>)\n\nMore article content.\n\n[Download paper](assets/mathematical%20model.PDF)\n\n![Diagram](assets/diagram.svg)',
  long:'![Long mathematical paper](assets/long-paper.pdf)',
  one:'![One-page paper](assets/one-page.pdf)',
  encoded:'![Encoded filename](assets/research%20%23%20%CE%B1.PDF?edition=1#page=1)',
  deferred:'<div style="height:3000px">Introductory space for lazy-loading test.</div>\n\n![Deferred document](assets/one-page.pdf)',
  malformed:'![Malformed paper](assets/malformed.pdf)\n\nArticle rendering survives.\n\n![Diagram](assets/diagram.svg)',
  missing:'![Missing paper](assets/missing.pdf)',
};
async function project(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'site-pdf-'));
  const folder=path.join(root,'content/projects/pdf-fixture'),assets=path.join(folder,'assets');
  fs.mkdirSync(assets,{recursive:true});
  for(const name of ['mathematical model.PDF','long-paper.pdf','one-page.pdf'])fs.copyFileSync(path.join(__dirname,name),path.join(assets,name));
  fs.copyFileSync(path.join(__dirname,'one-page.pdf'),path.join(assets,'research # α.PDF'));
  fs.writeFileSync(path.join(assets,'malformed.pdf'),'This is not a PDF document.');
  fs.writeFileSync(path.join(assets,'diagram.svg'),'<svg xmlns="http://www.w3.org/2000/svg" width="300" height="160"><path d="M10 150L150 10L290 150Z" fill="none" stroke="black"/></svg>');
  for(const [key,body] of Object.entries(bodies)){
    fs.writeFileSync(path.join(folder,`${key}.md`),matter.stringify(body,{id:`pdf-${key}`,title:`PDF ${key}`,slug:`projects/pdf-fixture/${key}`,section:'projects',type:'project-note',audience:['public','professional'],status:'complete',published:true,created:'2026-10-15',layout:'project'}));
  }
  fs.writeFileSync(path.join(root,'site.config.json'),JSON.stringify(require('../../../site.config.json')));
  fs.writeFileSync(path.join(root,'site.shell.html'),'<html><head><title>Fixture</title></head><body></body></html>');
  fs.writeFileSync(path.join(root,'style.css'),'');
  const manifest=buildManifest(root);
  await buildDocuments(root,manifest);
  return {root,manifest,close:()=>fs.rmSync(root,{recursive:true,force:true})};
}
module.exports={project,bodies};
