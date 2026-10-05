const test=require('node:test'),assert=require('node:assert/strict');
const {createContentModel}=require('../js/content');
const {createNavigation,nextSibling,visitTrail,previousTrail}=require('../js/navigation');
const manifest=require('../manifest.json'),config=require('../site.config.json');
for(const mode of ['professional','public'])test(mode+' root and project sibling boundaries',()=>{
 const model=createContentModel(manifest,mode,config),nav=createNavigation(model,config,mode);
 assert.equal(nextSibling(nav,model.resolve('home')).slug,'about');
 assert.equal(nextSibling(nav,model.resolve('about')).slug,'currents');
 assert.equal(nextSibling(nav,model.resolve('currents')),null);
 const pages=nav.catalog.get('projects/zion').pages;
 pages.forEach((page,i)=>assert.equal(nextSibling(nav,page),pages[i+1]||null));
});
test('nested groups and filtered middle sibling never cross a parent boundary',()=>{
 const cfg={sections:[{id:'projects',label:'Projects'}],projects:[{id:'example',label:'Example'}],groups:[{id:'experiments',label:'Experiments',parent:'projects/example'},{id:'hardware',label:'Hardware',parent:'projects/example'}]};
 const pages=['traffic','hidden','diffusion','fpga'].map((id,i)=>({id,slug:id,title:id,published:true,topics:[],created:'2026-01-01',order:i,section:'projects',project:'example',parent:id==='fpga'?'hardware':'experiments',audience:id==='hidden'?['public']:['public','professional']}));
 for(const mode of ['public','professional']){
 const model=createContentModel({pages,aliases:{}},mode),nav=createNavigation(model,cfg,mode);
 assert.equal(nextSibling(nav,pages[0]).id,mode==='public'?'hidden':'diffusion');
 assert.equal(nextSibling(nav,pages[2]),null);
 assert.equal(nextSibling(nav,pages[3]),null);
 }
});
test('internal trail deduplicates synchronization, restores browser snapshots, and falls back home',()=>{
 let trail=visitTrail([],'home');
 for(const slug of ['projects/zion','projects/zion/architecture','currents'])trail=visitTrail(trail,slug);
 assert.deepEqual(visitTrail(trail,'currents'),trail);
 for(const slug of ['projects/zion/architecture','projects/zion','home']){trail=previousTrail(trail);assert.equal(trail.at(-1),slug);}
 assert.deepEqual(previousTrail(['about']),['home']);
 assert.deepEqual(visitTrail(['home','about','currents'],'about',['home','about']),['home','about']);
});
