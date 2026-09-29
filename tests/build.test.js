const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const matter = require('gray-matter');
const { buildManifest } = require('../build');
const metadata = { id:'test',title:'Test',slug:'notes/test',section:'notes',type:'note',audience:['public'],status:'active',published:true,created:'2026-04-24' };
function fixture(t) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'site-manifest-'));
  fs.mkdirSync(path.join(root,'content'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  return {root, write(name,data=metadata) { const dest=path.join(root,'content',name);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,matter.stringify('Body stays intact.\n',JSON.parse(JSON.stringify(data)))); }};
}
test('parses YAML, defaults modified, indexes assets and excludes private authoring files',t=>{
  const f=fixture(t); f.write('page.md');f.write('drafts/no.md',{});f.write('.obsidian/no.md',{});f.write('.hidden/no.md',{});f.write('unpublished.md',{published:false});
  fs.writeFileSync(path.join(f.root,'content','photo.jpg'),'asset');
  const m=buildManifest(f.root);assert.equal(m.pages.length,1);assert.equal(m.pages[0].modified,'2026-04-24');assert.equal(m.pages[0].body,'Body stays intact.\n');assert.deepEqual(m.assetDirectories.content,['photo.jpg']);
});
for (const key of ['id','slug']) test(`rejects duplicate ${key} with source names`,t=>{
 const f=fixture(t);f.write('a.md');f.write('b.md',{...metadata,id:'other',slug:'notes/other',[key]:metadata[key]});assert.throws(()=>buildManifest(f.root),new RegExp(`duplicate ${key}.*also in content/a.md`));
});
for (const [label,patch,error] of [['required',{title:undefined},'missing required metadata "title"'],['section',{section:'sciences'},'invalid section'],['audience',{audience:['private']},'invalid audience'],['status',{status:'unknown'},'invalid status'],['date',{created:'2026-02-30'},'valid YYYY-MM-DD'],['published',{published:'false'},'published must be a boolean']]) test(`rejects invalid ${label}`,t=>{
 const f=fixture(t);f.write('bad.md',{...metadata,...patch});assert.throws(()=>buildManifest(f.root),new RegExp(error));
});
test('unpublishing removes page and aliases; filesystem dates have no authority',t=>{
 const f=fixture(t);f.write('page.md');
 const before=buildManifest(f.root).pages;
 fs.utimesSync(path.join(f.root,'content/page.md'),new Date('1999-01-01'),new Date('2040-01-01'));
 assert.deepEqual(buildManifest(f.root).pages,before);
 fs.writeFileSync(path.join(f.root,'legacy-routes.json'),JSON.stringify({'old.md':'notes/test'}));
 f.write('page.md',{...metadata,published:false});
 assert.deepEqual(buildManifest(f.root).pages,[]);
 assert.deepEqual(buildManifest(f.root).aliases,{});
});
test('rejects invalid type',t=>{const f=fixture(t);f.write('bad.md',{...metadata,type:'mystery'});assert.throws(()=>buildManifest(f.root),/invalid type/);});
for(const [patch,error] of [[{layout:'invalid'},/invalid layout/],[{layout:'custom',layoutClass:'bad class'},/layoutClass/],[{layout:'essay',indexStatus:'yes'},/indexStatus/]])test('validates layout metadata '+JSON.stringify(patch),t=>{const f=fixture(t);f.write('bad.md',{...metadata,...patch});assert.throws(()=>buildManifest(f.root),error);});
test('layout metadata and custom hook survive without changing Markdown',t=>{const f=fixture(t);f.write('page.md',{...metadata,layout:'custom',layoutClass:'spatial-demo'});const p=buildManifest(f.root).pages[0];assert.equal(p.layout,'custom');assert.equal(p.layoutClass,'spatial-demo');assert.equal(p.body,'Body stays intact.\n');});
