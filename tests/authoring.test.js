const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {scaffold}=require('../tools/new');const {buildManifest}=require('../build');
test('scaffold creates valid public-only project and note; protects existing files',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'site-authoring-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));fs.mkdirSync(path.join(root,'content'));
 const project=scaffold(root,{type:'project',title:'Anvesana'});assert.ok(fs.existsSync(path.join(path.dirname(project),'assets')));
 scaffold(root,{type:'note',title:'Abstraction and Computation'});
 const m=buildManifest(root);assert.equal(m.pages.length,2);assert.ok(m.pages.every(p=>p.audience.join()==='public'));
 assert.throws(()=>scaffold(root,{type:'project',title:'Anvesana'}),/already/);
 assert.throws(()=>scaffold(root,{type:'note',title:'Invalid',collection:'../../escape'}),/identifier/);
});

test('Markdown asset discovery preserves titles and reference image destinations',()=>{
 const {markdownReferences}=require('../tools/markdown');
 const refs=markdownReferences('![The drawing](assets/a.jpg "A caption")\n\n![A reference][photo]\n\n[photo]: assets/b.jpg "Second caption"\n\n[Read](#/notes/test)');
 assert.deepEqual(refs.images,[{href:'assets/a.jpg',alt:'The drawing'},{href:'assets/b.jpg',alt:'A reference'}]);
 assert.deepEqual(refs.links,['#/notes/test']);
});
test('asset audit reports exact duplicates, backups, and unused files without deleting anything',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'site-assets-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));fs.mkdirSync(path.join(root,'assets'));fs.mkdirSync(path.join(root,'content'));
 for(const name of ['one.png','copy.png','edit.png~'])fs.writeFileSync(path.join(root,'assets',name),'same bytes');
 fs.writeFileSync(path.join(root,'site.shell.html'),'<img src="assets/one.png">');
 const warnings=require('../tools/assets').auditAssets(root);
 assert.ok(warnings.some(w=>w.startsWith('Exact duplicate')));assert.ok(warnings.some(w=>w.includes('editor backup')));
 assert.ok(warnings.some(w=>w.includes('copy.png: possibly unreferenced')));assert.ok(!warnings.some(w=>w.includes('one.png: possibly unreferenced')));assert.equal(fs.readdirSync(path.join(root,'assets')).length,3);
});
