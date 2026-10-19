const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {Marked}=require('marked');
const {isPdf,localPath,renderer}=require('../js/pdf');
const {project}=require('./fixtures/pdf/project.cjs');

test('only PDF image syntax produces a viewer; ordinary images and links keep Marked behavior',()=>{
  const pdf=new Marked({renderer:renderer()}),normal=new Marked();
  for(const href of ['assets/model.pdf','assets/research-paper.PDF','assets/a%20b.pdf','assets/a%2Epdf?version=1#page=2','<assets/my paper.pdf>']){
    const html=pdf.parse(`![Paper title](${href})`);
    assert.match(html,/class="pdf-embed"/);assert.match(html,/aria-label="Paper title"/);assert.doesNotMatch(html,/<img/);
  }
  for(const markdown of ['![Diagram](assets/diagram.png "Caption")','[Download paper](assets/model.pdf)','`![Paper](assets/model.pdf)`','![Diagram][image]\n\n[image]: assets/diagram.webp'])assert.equal(pdf.parse(markdown),normal.parse(markdown));
  assert.match(pdf.parse('![Reference][paper]\n\n[paper]: assets/model.pdf'),/pdf-embed/);
  assert.doesNotMatch(pdf.parse('![&quot; onmouseover=&quot;bad](assets/model.pdf)'),/ onmouseover="bad/);
});
test('PDF URLs decode once and retain project-relative semantics for both shells',()=>{
  assert.equal(localPath('content/projects/paragonalia','assets/research%20%23%20%CE%B1.PDF?q=1#page=2'),'content/projects/paragonalia/assets/research # α.PDF');
  assert.equal(localPath('content/projects/paragonalia','../shared/a.pdf'),'content/projects/shared/a.pdf');
  assert.equal(localPath('content/projects/paragonalia','/content/paper.pdf'),'content/paper.pdf');
  assert.equal(localPath('content/projects/paragonalia','https://example.com/a.pdf'),null);
  for(const ref of ['assets/image.png','assets/broken%.pdf','assets/file.pdf.png'])assert.equal(isPdf(ref),false);
  assert.equal(isPdf('assets/a%2520b.pdf'),true);
});
test('build preserves PDF bytes, reserves mixed page boxes, excludes Sharp, and check names broken sources',async t=>{
  const f=await project();t.after(f.close);
  const {build}=require('../build'),{checkContent}=require('../tools/check');
  const source=path.join(f.root,'content/projects/pdf-fixture/assets/mathematical model.PDF');
  const original=fs.readFileSync(source);
  const manifest=await build(f.root);
  assert.deepEqual(fs.readFileSync(source),original);
  const page=manifest.pages.find(p=>p.id==='pdf-ten');
  const docs=JSON.parse(fs.readFileSync(path.join(f.root,page.documents)));
  const dimensions=docs['content/projects/pdf-fixture/assets/mathematical model.PDF'].pages;
  assert.equal(dimensions.length,10);assert.deepEqual(dimensions[0],[612,792]);assert.deepEqual(dimensions[2],[792,612]);assert.deepEqual(dimensions[3],[612,612]);
  assert.equal(manifest.assetDirectories['content/projects/pdf-fixture/assets'].includes('mathematical model.PDF'),true);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.root,'generated/image-index.json'))),{});
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.root,page.images))),{});
  const errors=checkContent(f.root).errors;
  assert.deepEqual(errors,['content/projects/pdf-fixture/missing.md: Missing local asset: assets/missing.pdf']);
  for(const file of ['pdf.min.mjs','pdf.worker.min.mjs','pdf_viewer.css','LICENSE','cmaps','standard_fonts','wasm','iccs'])assert.ok(fs.existsSync(path.join(f.root,'generated/vendor/pdfjs',file)));
  assert.deepEqual(fs.readFileSync(path.join(f.root,'generated/vendor/pdfjs/pdf.min.mjs')),fs.readFileSync(require.resolve('pdfjs-dist/build/pdf.min.mjs')));
});
