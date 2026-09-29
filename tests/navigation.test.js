const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createContentModel}=require('../js/content');
const {createNavigation}=require('../js/navigation');
const manifest=require('../manifest.json');
const config=require('../site.config.json');
test('public sections, project receipts, collections and topics use metadata',()=>{
 const model=createContentModel(manifest,'public'),nav=createNavigation(model,config,'public');
 assert.deepEqual(nav.sections.map(s=>s.key),['home','projects','notes','archive','about']);
 assert.equal(nav.catalog.get('projects/akashom').pages.length,4);
 assert.equal(nav.catalog.get('projects/mindscape').pages.length,7);
 assert.equal(nav.catalog.get('notes/mindfill').pages.length,8);
 assert.ok(model.topic('computation').some(p=>p.project==='akashom'));
 const moved={...manifest,pages:manifest.pages.map(p=>({...p,source:'anywhere/'+p.id+'.md',assetBase:'somewhere'}))};
 const shape=nav=>nav.sections.map(s=>({key:s.key,pages:s.pages.map(p=>p.id),groups:s.children.map(g=>({key:g.key,pages:g.pages.map(p=>p.id)}))}));
 assert.deepEqual(shape(createNavigation(createContentModel(moved,'public'),config,'public')),shape(nav));
});
test('professional filtering precedes grouping, lookups, topics and next-page lists',()=>{
 const model=createContentModel(manifest,'professional'),nav=createNavigation(model,config,'professional');
 assert.equal(model.pages.length,9);
 assert.deepEqual(nav.sections.map(s=>s.key),['home','projects','notes','about']);
 assert.deepEqual(nav.catalog.get('projects').children.map(s=>s.key),['projects/akashom','projects/jivan','projects/cornocupia']);
 assert.equal(nav.catalog.get('notes/mindfill').pages.length,1);
 for(const node of nav.catalog.values())assert.ok(node.pages.every(p=>p.audience.includes('professional')));
 assert.equal(model.resolve('archive/consumption'),undefined);
 assert.equal(model.resolve('arts/prose/pm_02/projectMindscape.md'),undefined);
 assert.ok(model.topic('computation').every(p=>p.audience.includes('professional')));
});
test('all legacy aliases resolve within eligible views',()=>{
 const model=createContentModel(manifest,'public');
 for(const [alias,slug] of Object.entries(manifest.aliases))assert.equal(model.resolve(alias).slug,slug,alias);
});
test('receipts contain only direct leaves while unread retains descendants',()=>{
 const nav=createNavigation(createContentModel(manifest,'public'),config,'public');
 for(const section of ['projects','notes','archive']) {
  assert.equal(nav.catalog.get(section).pages.length,0,section);
  assert.ok(nav.catalog.get(section).allPages.length>0,section);
 }
 assert.equal(nav.catalog.get('notes/mindfill').pages.length,8);
});
