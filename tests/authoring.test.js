const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {scaffold,parseArgs,main}=require('../tools/new');const {buildManifest}=require('../build');
const {createContentModel}=require('../js/content');
const {createNavigation,firstLeaf}=require('../js/navigation');
const matter=require('gray-matter');
test('scaffold creates a professional project and a personal note; protects existing files',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'site-authoring-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));fs.mkdirSync(path.join(root,'content'));
 const project=scaffold(root,{type:'project',title:'Anvesana'});assert.ok(fs.existsSync(path.join(path.dirname(project),'assets')));
 scaffold(root,{type:'note',title:'Abstraction and Computation'});
 const m=buildManifest(root);assert.equal(m.pages.length,2);
 assert.deepEqual(m.pages.find(p=>p.type==='project').audience,['public','professional']);
 assert.deepEqual(m.pages.find(p=>p.type==='note').audience,['public']);
 assert.throws(()=>scaffold(root,{type:'project',title:'Anvesana'}),/already/);
 assert.throws(()=>scaffold(root,{type:'note',title:'Invalid',collection:'../../escape'}),/identifier/);
});

function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'site-creation-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.mkdirSync(path.join(root,'content'));
 const config=structuredClone(require('../site.config.json'));
 fs.writeFileSync(path.join(root,'site.config.json'),JSON.stringify(config));
 fs.writeFileSync(path.join(root,'site.shell.html'),'<html><head><title>Test</title></head><body></body></html>');
 fs.writeFileSync(path.join(root,'style.css'),'');
 return {root,config};
}

test('short commands and original flags accept titles and report malformed options',()=>{
 assert.deepEqual(parseArgs(['project','ZION']),{type:'project',title:'ZION'});
 assert.deepEqual(parseArgs(['archive','Old','sketches','--collection','ideas']),{type:'archive',title:'Old sketches',collection:'ideas'});
 assert.deepEqual(parseArgs(['--type','project','--title','ZION','--audience','public']),{type:'project',title:'ZION',audience:'public'});
 assert.deepEqual(parseArgs(['project','--title','ZION']),{type:'project',title:'ZION'});
 assert.equal(parseArgs(['--help']).help,true);
 assert.throws(()=>parseArgs(['project','ZION','--audience']),/Missing value/);
 assert.throws(()=>parseArgs(['--title','--type','project']),/Missing value/);
 assert.throws(()=>parseArgs(['--typo','project']),/Unknown option/);
 assert.throws(()=>parseArgs(['project','ZION','--title','Other']),/title once/);
});

test('creation rebuilds a new project and archive into their navigation with no config edits',async t=>{
 const {root,config}=fixture(t),before=fs.readFileSync(path.join(root,'site.config.json'),'utf8');
 const logs=[];t.mock.method(console,'log',message=>logs.push(message));
 await main(['project','NASA Tools'],root);
 await main(['archive','Old sketches','--collection','ideas'],root);
 await main(['archive','Loose sketch'],root);
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
 const pro=createContentModel(manifest,'professional',config),personal=createContentModel(manifest,'public',config);
 const proNav=createNavigation(pro,config,'professional'),personalNav=createNavigation(personal,config,'public');
 assert.equal(proNav.catalog.get('projects/nasa-tools').label,'NASA Tools');
 assert.equal(firstLeaf(proNav.catalog.get('projects')).slug,'projects/nasa-tools');
 assert.equal(personalNav.catalog.get('projects/nasa-tools').label,'NASA Tools');
 assert.equal(personalNav.catalog.get('archive/ideas').pages[0].slug,'archive/ideas/old-sketches');
 assert.equal(personalNav.catalog.get('archive').pages[0].slug,'archive/loose-sketch');
 assert.equal(pro.resolve('archive/ideas/old-sketches'),undefined);
 assert.equal(pro.resolve('archive/loose-sketch'),undefined);
 for(const page of manifest.pages)assert.ok(fs.existsSync(path.join(root,page.source)));
 assert.equal(fs.readFileSync(path.join(root,'site.config.json'),'utf8'),before);
 assert.ok(logs.some(line=>line.includes('/#/projects/nasa-tools')));
 assert.ok(logs.some(line=>line.includes('/personal/#/archive/ideas/old-sketches')));
});

test('project notes inherit audience and use their project folder; overview stays first',t=>{
 const {root,config}=fixture(t);
 const overview=scaffold(root,{type:'project',title:'NASA'});
 const moved=path.join(root,'content/projects/parent/nasa');fs.mkdirSync(path.dirname(moved),{recursive:true});
 fs.renameSync(path.dirname(overview),moved);
 const note=scaffold(root,{type:'project-note',title:'AAA Design',project:'nasa'});
 assert.equal(path.dirname(note),moved);
 assert.deepEqual(matter(fs.readFileSync(note,'utf8')).data.audience,['public','professional']);
 const nav=createNavigation(createContentModel(buildManifest(root),'professional',config),config,'professional');
 assert.equal(firstLeaf(nav.catalog.get('projects/nasa')).slug,'projects/nasa');
 scaffold(root,{type:'project',title:'Private sketch',audience:'public'});
 const personalNote=scaffold(root,{type:'project-note',title:'Notes',project:'private-sketch'});
 assert.deepEqual(matter(fs.readFileSync(personalNote,'utf8')).data.audience,['public']);
 assert.equal(createContentModel(buildManifest(root),'professional',config).resolve('projects/private-sketch'),undefined);
 assert.throws(()=>scaffold(root,{type:'project-note',title:'Lost',project:'missing'}),/Unknown published project/);
 assert.equal(fs.existsSync(path.join(root,'content/projects/missing')),false);
});

test('invalid audiences and unsupported grouping fail before creating content',t=>{
 const {root}=fixture(t);
 for(const options of [
  {type:'project',audience:'private'},
  {type:'archive',audience:'professional'},
  {type:'project',collection:'ideas'},
  {type:'note',project:'zion'},
  {type:'archive',project:'zion',collection:'ideas'},
 ])assert.throws(()=>scaffold(root,{title:'Invalid',...options}));
 assert.deepEqual(fs.readdirSync(path.join(root,'content')),[]);
});

test('new pages cannot shadow a retained route after a rename',t=>{
 const {root}=fixture(t);
 scaffold(root,{type:'project',title:'ZION'});
 fs.writeFileSync(path.join(root,'legacy-routes.json'),JSON.stringify({'projects/akashom':'projects/zion'}));
 assert.throws(()=>scaffold(root,{type:'project',title:'Akashom'}),/existing alias for projects\/zion/);
 assert.equal(fs.existsSync(path.join(root,'content/projects/akashom')),false);
});

test('rebuild errors preserve the created page and explain how to recover',async t=>{
 const {root}=fixture(t);t.mock.method(console,'log',()=>{});
 fs.unlinkSync(path.join(root,'site.shell.html'));
 await assert.rejects(main(['project','Saved work'],root),/page was created.*rebuilding failed[\s\S]*npm run build/);
 assert.ok(fs.existsSync(path.join(root,'content/projects/saved-work/index.md')));
 assert.throws(()=>scaffold(root,{type:'project',title:'Saved work'}),/already/);
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
