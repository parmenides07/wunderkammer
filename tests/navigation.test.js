const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createContentModel}=require('../js/content');
const {createNavigation}=require('../js/navigation');
const manifest=require('../manifest.json');
const config=require('../site.config.json');
test('public sections, project receipts, collections and topics use metadata',()=>{
 const model=createContentModel(manifest,'public'),nav=createNavigation(model,config,'public');
 assert.deepEqual(nav.sections.map(s=>s.key),['home','projects','notes','archive','about','currents']);
 assert.equal(nav.catalog.get('projects/zion').pages.length,4);
 assert.equal(nav.catalog.get('projects/mindscape').pages.length,7);
 assert.equal(nav.catalog.get('notes/mindfill').pages.length,8);
 assert.ok(model.topic('computation').some(p=>p.project==='zion'));
 const moved={...manifest,pages:manifest.pages.map(p=>({...p,source:'anywhere/'+p.id+'.md',assetBase:'somewhere'}))};
 const shape=nav=>nav.sections.map(s=>({key:s.key,pages:s.pages.map(p=>p.id),groups:s.children.map(g=>({key:g.key,pages:g.pages.map(p=>p.id)}))}));
 assert.deepEqual(shape(createNavigation(createContentModel(moved,'public'),config,'public')),shape(nav));
});
test('professional filtering precedes grouping, lookups, topics and next-page lists',()=>{
 const model=createContentModel(manifest,'professional',config),nav=createNavigation(model,config,'professional');
 assert.ok(model.pages.every(p=>p.audience.includes('professional')));
 assert.deepEqual(nav.sections.map(s=>s.key),['home','projects','about','currents']);
 const projects=nav.catalog.get('projects').children.map(s=>s.key);
 assert.deepEqual(projects.slice(0,4),['projects/zion','projects/cornocupia','projects/vivarium','projects/mindscape']);
 assert.equal(projects.length,new Set(model.pages.filter(p=>p.section==='projects').map(p=>p.project)).size);
 assert.equal(nav.catalog.get('projects/zion').label,'ZION');
 assert.equal(nav.catalog.has('notes'),false);
 for(const node of nav.catalog.values())assert.ok(node.pages.every(p=>p.audience.includes('professional')));
 assert.equal(model.resolve('archive/consumption'),undefined);
 assert.equal(model.resolve('arts/prose/pm_02/projectMindscape.md').project,'mindscape');
 assert.ok(model.topic('computation').every(p=>p.audience.includes('professional')));
});
test('all legacy aliases resolve within eligible views',()=>{
 const model=createContentModel(manifest,'public');
 for(const [alias,slug] of Object.entries(manifest.aliases))assert.equal(model.resolve(alias).slug,slug,alias);
});
test('ZION keeps its old project and file links in both views',()=>{
 for(const audience of ['public','professional']){
  const model=createContentModel(manifest,audience,config);
  for(const suffix of ['','/architecture','/visual-design','/visual-nonvisual-trailer']){
   assert.equal(model.resolve('projects/akashom'+suffix)?.slug,'projects/zion'+suffix);
  }
  assert.equal(model.resolve('sciences/akashom/akashom.md')?.id,'projects-zion');
 }
});
test('receipts contain only direct leaves while unread retains descendants',()=>{
 const nav=createNavigation(createContentModel(manifest,'public'),config,'public');
 for(const section of ['projects','notes']) {
  assert.equal(nav.catalog.get(section).pages.length,0,section);
  assert.ok(nav.catalog.get(section).allPages.length>0,section);
 }
 assert.deepEqual(nav.catalog.get('archive').pages.map(p=>p.slug),['archive/inspiring-media']);
 assert.ok(nav.catalog.get('archive').allPages.length>1);
 assert.equal(nav.catalog.get('notes/mindfill').pages.length,8);
});
test('nested semantic groups use direct leaves, active ancestors, and the filtered universe',()=>{
 const config={sections:[{id:'projects',label:'Projects'}],projects:[{id:'anvesana',label:'Anvesana'}],collections:[],groups:[
  {id:'anvesana-experiments',label:'Experiments',parent:'projects/anvesana'},
  {id:'anvesana-hardware',label:'Hardware',parent:'projects/anvesana'},
  {id:'anvesana-traffic',label:'Traffic',parent:'anvesana-experiments'}]};
 const page=(id,parent,audience=['public'])=>({id,slug:id,title:id,section:'projects',project:'anvesana',parent,audience,published:true,topics:[],order:0,created:'2026-09-29'});
 const pages=[page('overview',null,['public','professional']),page('diffusion','anvesana-experiments'),page('traffic','anvesana-traffic'),page('fpga','anvesana-hardware',['public','professional'])];
 const {activePath}=require('../js/navigation');
 const nav=createNavigation(createContentModel({pages,aliases:{},assetDirectories:{}},'public'),config,'public');
 assert.deepEqual(nav.catalog.get('projects/anvesana').pages.map(p=>p.id),['overview']);
 assert.deepEqual(nav.catalog.get('group/anvesana-experiments').pages.map(p=>p.id),['diffusion']);
 assert.deepEqual(activePath(nav,nav.pageGroups.get('traffic')),['projects','projects/anvesana','group/anvesana-experiments']);
 const work=createNavigation(createContentModel({pages,aliases:{},assetDirectories:{}},'professional'),config,'professional');
 assert.equal(work.catalog.has('group/anvesana-experiments'),false);
 assert.equal(work.catalog.get('projects/anvesana').children.length,1);
 assert.throws(()=>createNavigation({pages}, {...config,groups:[{id:'loop',label:'Loop',parent:'loop'}]},'public'),/cycle/);
 assert.throws(()=>createNavigation({pages:[page('bad','missing')]},config,'public'),/unknown parent/);
 assert.throws(()=>createNavigation({pages:[]},{...config,groups:[{id:'bad',label:'Bad',parent:'missing'}]},'public'),/unknown parent/);
});
test('index entries are chronological, exclude the landing, and never escape the audience filter',()=>{
 const {indexEntries}=require('../js/navigation');const model=createContentModel(manifest,'public'),nav=createNavigation(model,config,'public');
 const landing=model.byId.get('notes-mindfill'),entries=indexEntries(landing,nav);
 assert.equal(entries.length,7);assert.ok(entries.every(p=>p.id!==landing.id));
 assert.deepEqual(entries.map(p=>p.created),entries.map(p=>p.created).sort().reverse());
 const work=createContentModel(manifest,'professional',config),wn=createNavigation(work,config,'professional');
 assert.deepEqual(indexEntries(landing,wn),[]);
});

test('build validation rejects an unknown base container while a filtered empty subtree can be pruned',()=>{
 const c={sections:[{id:'projects',label:'Projects'}],projects:[],collections:[],groups:[{id:'child',label:'Child',parent:'projects/missing'}]};
 assert.throws(()=>createNavigation({pages:[]},c,'public',true),/unknown parent container/);
 assert.equal(createNavigation({pages:[]},c,'professional').sections.length,0);
});
