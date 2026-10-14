const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const matter=require('gray-matter');
const {buildManifest,build}=require('../build');
const {createContentModel}=require('../js/content');
const {createNavigation,firstLeaf,nextSibling}=require('../js/navigation');

function fixture(t) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'content-folders-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const config={sections:[{id:'projects',label:'Projects'},{id:'notes',label:'Notes'},{id:'archive',label:'Archive'}],
    projects:[{id:'jivan',label:'Jivan'},{id:'ghost',label:'Ghost'}],collections:[],
    groups:[{id:'stale',label:'Old location',parent:'projects/ghost'}]};
  fs.mkdirSync(path.join(root,'content'));
  fs.writeFileSync(path.join(root,'site.config.json'),JSON.stringify(config));
  fs.writeFileSync(path.join(root,'site.shell.html'),'<html><head><title>Test</title></head><body></body></html>');
  fs.writeFileSync(path.join(root,'style.css'),'');
  function write(file,patch={}) {
    const destination=path.join(root,'content',file);
    fs.mkdirSync(path.dirname(destination),{recursive:true});
    const data={id:'jivan',title:'Jivan',slug:'projects/jivan',section:'projects',type:'project',project:'jivan',
      audience:['public','professional'],status:'active',published:true,created:'2026-01-01',...patch};
    fs.writeFileSync(destination,matter.stringify('Current content.\n',data));return destination;
  }
  function nav(mode='professional') {
    const manifest=buildManifest(root),model=createContentModel(manifest,mode,config);
    return {manifest,model,...createNavigation(model,config,mode)};
  }
  return {root,config,write,nav};
}

test('nested source folders override stale project and parent metadata in both views',t=>{
  const f=fixture(t);
  f.write('projects/akasha/index.md',{id:'akasha',title:'Akasha',slug:'projects/akasha',project:'akasha'});
  f.write('projects/akasha/jivan/index.md',{parent:'stale'});
  for(const mode of ['public','professional']) {
    const nav=f.nav(mode);
    assert.deepEqual(nav.catalog.get('projects').children.map(node=>node.key),['projects/akasha']);
    assert.deepEqual(nav.catalog.get('projects/akasha').children.map(node=>node.key),['projects/akasha/jivan']);
    assert.equal(nav.pageGroups.get('jivan').key,'projects/akasha/jivan');
    assert.equal(nav.model.resolve('projects/jivan').project,'akasha');
    assert.equal(nav.model.resolve('projects/jivan').parent,null);
    assert.equal(nav.catalog.has('projects/jivan'),false);
    assert.equal(nav.catalog.has('projects/ghost'),false);
    assert.equal(nav.catalog.has('group/stale'),false);
    assert.equal(firstLeaf(nav.catalog.get('projects/akasha')).id,'akasha');
  }
});

test('moving and renaming folders updates ownership and assets without changing page identity or URL',t=>{
  const f=fixture(t);
  f.write('projects/jivan/index.md');
  assert.equal(f.nav().pageGroups.get('jivan').key,'projects/jivan');
  fs.mkdirSync(path.join(f.root,'content/projects/akasha'));
  fs.renameSync(path.join(f.root,'content/projects/jivan'),path.join(f.root,'content/projects/akasha/renamed'));
  const nav=f.nav(),page=nav.model.resolve('projects/jivan');
  assert.equal(page.id,'jivan');
  assert.equal(page.assetBase,'content/projects/akasha/renamed');
  assert.equal(nav.pageGroups.get('jivan').key,'projects/akasha/renamed');
  assert.equal(nav.catalog.has('projects/jivan'),false);
  assert.equal(firstLeaf(nav.catalog.get('projects/akasha')).id,'jivan');
});

test('section moves follow the source location and preserve editorial visibility',t=>{
  const f=fixture(t);
  f.write('archive/career/index.md',{section:'projects',project:'jivan',collection:'old-career',audience:['public']});
  const nav=f.nav('public'),page=nav.model.resolve('projects/jivan');
  assert.equal(page.section,'archive');assert.equal(page.project,null);assert.equal(page.collection,'career');
  assert.equal(nav.pageGroups.get('jivan').key,'archive/career');
  assert.equal(f.nav().model.resolve('projects/jivan'),undefined);
});

test('root-level content and stale group settings cannot switch a rebuilt site back to metadata grouping',t=>{
  const f=fixture(t);
  f.write('projects/akasha/jivan/index.md');
  const loose=f.write('loose.md',{id:'loose',slug:'notes/loose',section:'notes',type:'note'});
  assert.equal(f.nav().pageGroups.get('jivan').key,'projects/akasha/jivan');
  assert.equal(f.nav().pageGroups.get('loose').key,'notes');
  fs.unlinkSync(loose);
  fs.unlinkSync(path.join(f.root,'content/projects/akasha/jivan/index.md'));
  assert.deepEqual(f.nav().sections,[]);
});

test('nested receipts contain direct files; hidden pages and asset-only folders never create navigation',t=>{
  const f=fixture(t);
  f.write('projects/akasha/index.md',{id:'akasha',title:'Akasha',slug:'projects/akasha',project:'akasha'});
  f.write('projects/akasha/jivan/index.md');
  f.write('projects/akasha/jivan/notes.md',{id:'notes',title:'Notes',slug:'projects/jivan/notes',type:'project-note',order:200});
  f.write('projects/akasha/private/index.md',{id:'private',slug:'projects/private',audience:['public']});
  f.write('projects/akasha/draft/index.md',{id:'draft',slug:'projects/draft',published:false});
  fs.mkdirSync(path.join(f.root,'content/projects/unused/assets'),{recursive:true});
  const nav=f.nav();
  assert.deepEqual(nav.catalog.get('projects/akasha').pages.map(page=>page.id),['akasha']);
  assert.deepEqual(nav.catalog.get('projects/akasha/jivan').pages.map(page=>page.id),['jivan','notes']);
  assert.equal(nextSibling(nav,nav.model.byId.get('akasha')),null);
  assert.equal(nextSibling(nav,nav.model.byId.get('jivan')).id,'notes');
  for(const key of ['projects/unused','projects/akasha/private','projects/akasha/draft'])assert.equal(nav.catalog.has(key),false);
  assert.ok(f.nav('public').catalog.has('projects/akasha/private'));
});

test('editing, unpublishing and deleting source files remove stale generated pages, metadata and aliases',async t=>{
  const f=fixture(t),source=f.write('projects/jivan/index.md');
  fs.writeFileSync(path.join(f.root,'legacy-routes.json'),JSON.stringify({'old-jivan':'projects/jivan'}));
  t.mock.method(console,'log',()=>{});
  await build(f.root);
  fs.appendFileSync(source,'An edit that must appear in the built page.\n');
  await build(f.root);
  assert.match(fs.readFileSync(path.join(f.root,'generated/pages/jivan.md'),'utf8'),/An edit that must appear/);
  const generated=()=>JSON.parse(fs.readFileSync(path.join(f.root,'manifest.json'),'utf8'));
  assert.equal(generated().aliases['old-jivan'],'projects/jivan');
  f.write('projects/jivan/index.md',{published:false});
  await build(f.root);
  assert.deepEqual(generated().pages,[]);assert.deepEqual(generated().aliases,{});
  assert.equal(fs.existsSync(path.join(f.root,'generated/pages/jivan.md')),false);
  assert.equal(fs.existsSync(path.join(f.root,'generated/images/jivan.json')),false);
  f.write('projects/jivan/index.md');await build(f.root);
  fs.unlinkSync(source);await build(f.root);
  assert.deepEqual(generated().pages,[]);
  assert.equal(fs.existsSync(path.join(f.root,'generated/pages/jivan.md')),false);
});
