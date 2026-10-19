const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const matter=require('gray-matter');
const {isVideo}=require('../js/videos');
const {markdownReferences}=require('../tools/markdown');

test('video detection supports case, encoded paths, queries and fragments without matching other media',()=>{
  for(const ref of ['assets/main.mp4','assets/clip.WEBM','assets/my clip.mp4','assets/my%20clip%2Emp4?v=1#t=2','https://example.test/clip.webm?x=1','/assets/clip.mp4'])assert.equal(isVideo(ref),true,ref);
  for(const ref of ['assets/a.png','assets/a.jpeg','assets/a.gif','assets/a.pdf','assets/a.mp4.png','assets/a.png?file=a.mp4','assets/bad%.webm','assets/clip.webm/thumbnail',null])assert.equal(isVideo(ref),false,String(ref));
});

test('existing Markdown references retain video descriptions and normal attachments',()=>{
  const refs=markdownReferences('![Main](assets/main.mp4 "Demo")\n\n![Reference][clip]\n\n[clip]: assets/clip.webm\n\n`![Literal](assets/literal.mp4)`\n\n[Download](assets/clip.webm)\n\n![Still](assets/still.png)\n\n![Paper](assets/paper.pdf)');
  assert.deepEqual(refs.images,[{href:'assets/main.mp4',alt:'Main'},{href:'assets/clip.webm',alt:'Reference'},{href:'assets/still.png',alt:'Still'},{href:'assets/paper.pdf',alt:'Paper'}]);
  assert.deepEqual(refs.links,['assets/clip.webm']);
});

test('build excludes video bytes from Sharp; checks and galleries recognize video assets',async t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'site-videos-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const folder=path.join(root,'content/projects/clips'),assets=path.join(folder,'assets');
  fs.mkdirSync(assets,{recursive:true});
  const original=fs.readFileSync(path.join(__dirname,'fixtures/videos/loop.webm'));
  fs.writeFileSync(path.join(assets,'my clip.webm'),original);
  fs.writeFileSync(path.join(assets,'gallery-only.mp4'),'Video bytes are not an image.');
  const body='![Reference](assets/my%20clip.webm?version=1#t=0)\n\nimages{assets, full}\n\n![Missing](assets/missing.mp4)';
  fs.writeFileSync(path.join(folder,'index.md'),matter.stringify(body,{id:'clips',title:'Clips',slug:'projects/clips',type:'project',audience:['public','professional'],status:'active',published:true,created:'2026-10-19'}));
  fs.writeFileSync(path.join(root,'site.config.json'),JSON.stringify(require('../site.config.json')));
  fs.writeFileSync(path.join(root,'site.shell.html'),'<html><head><title>Clips</title></head><body></body></html>');
  fs.writeFileSync(path.join(root,'style.css'),'');
  const manifest=await require('../build').build(root);
  assert.deepEqual(fs.readFileSync(path.join(assets,'my clip.webm')),original);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,'generated/image-index.json'))),{});
  assert.ok(manifest.assetDirectories['content/projects/clips/assets'].includes('gallery-only.mp4'));
  assert.deepEqual(require('../tools/check').checkContent(root).errors,['content/projects/clips/index.md: Missing local asset: assets/missing.mp4']);
  assert.equal(require('../tools/assets').auditAssets(root).some(w=>w.includes('possibly unreferenced')),false);
});
