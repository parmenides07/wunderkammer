import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, cp, rm, symlink } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { unzipSync } from 'fflate';
import { validatePage, translateElement, screenToWorld, snap } from '../client/model.js';
import { fileKind, downloadPath, fileLimit, decodeText, isPlainText, TEXT_LIMIT, extension } from '../client/files.js';
import { cloneElements, encodeClipboard, decodeClipboard } from '../client/clipboard.js';
import { History } from '../client/history.js';
import { validateFile, packageFile, fileReferences } from '../files.mjs';
import { renderDocument } from '../documents.mjs';
import { createSpaceServer } from '../server.mjs';
import { build } from '../build.mjs';
const source = new URL('../', import.meta.url).pathname;
const page = elements => ({ slug: 'home', camera: { x: -12, y: -8, zoom: .5 }, elements });
const element = (filename = 'notes.org') => ({ id: 'file', type: 'file', src: '/personal/assets/file-' + randomUUID() + '.' + extension(filename), filename, display: 'render', x: -8, y: 4, width: 24, height: 18, font: 'xanh', fontSize: 18 });

test('unified files preserve geometry, styles, source identity, history and clipboard', () => {
  const e = { ...element(), lineHeight: 1.5, letterSpacing: .02, zIndex: 4, shadow: true, locked: true, maximizable: false };
  const p = page([e]); validatePage(p);
  const history = new History(p); e.display = 'attach'; history.commit(p);
  assert.equal(history.undo().elements[0].display, 'render'); assert.equal(history.redo().elements[0].src, e.src);
  const copies = cloneElements(decodeClipboard(encodeClipboard([e])), 1);
  assert.notEqual(copies[0].id, e.id); assert.equal(copies[0].src, e.src); assert.equal(copies[0].x, e.x + 1);
  translateElement(copies[0], -1, -1); copies[0].id = e.id; assert.deepEqual(copies[0], e);
  assert.throws(() => validatePage(page([{ ...e, src: '/personal/assets/../../private.org' }])));
  assert.throws(() => validatePage(page([{ ...element('archive.zip'), display: 'render' }])));
  assert.throws(() => validatePage(page([{ ...e, filename: '../notes.org' }])));
  assert.equal(fileKind('notes.MD'), 'document'); assert.equal(fileKind('movie.webm'), 'video'); assert.equal(fileKind('photo.gif'), 'image');
  const point = screenToWorld({ x: 120, y: 75 }, p.camera, { width: 900, height: 600 });
  assert.deepEqual({ x: snap(point.x), y: snap(point.y) }, { x: -39, y: -27 });
});

test('Org and Markdown preserve headings, emphasis, nested lists, code, links and tables without execution', async () => {
  const org = '#+TITLE: Investigation\n* TODO Study\n** Details\n*bold* /italic/ _underline_ +strike+ =inline=\n\n- one\n  - nested\n\n#+begin_quote\nQuoted\n#+end_quote\n\n#+begin_src js\nconsole.log("code")\n#+end_src\n\n| a | b |\n|---+---|\n| 1 | 2 |\n\n[[https://example.org][example]]\n-----\n#+INCLUDE: "/etc/passwd"\n';
  const md = '# Investigation\n## Details\n**bold** *italic* `inline`\n\n- one\n  - nested\n\n> Quoted\n\n```js\nconsole.log("code")\n```\n\n| a | b |\n|---|---|\n|1|2|\n\n[example](https://example.org)\n\n---\n';
  for (const [filename, source] of [['notes.org', org], ['essay.md', md]]) {
    const html = await renderDocument(Buffer.from(source), filename);
    for (const match of [/<h1/, /<h2/, /<strong>bold/, /<em>italic/, /<ul>[\s\S]*<li>[\s\S]*<ul>/, /<blockquote>/, /<pre><code>/, /<code>inline/, /<table>/, /href="https:\/\/example.org"/, /<hr>/]) assert.match(html, match);
    assert.doesNotMatch(html, /root:x:|<script|onload=/);
  }
});

test('sanitization strips active HTML, unsafe URLs, styles and unimported references', async () => {
  const input = '# Title\n<script>window.pwned=1</script><iframe src="https://evil.test"></iframe><svg onload="alert(1)"></svg>\n<a href="javascript:alert(1)" onclick="alert(1)" style="color:red">unsafe</a>\n<img src="file:///etc/passwd" onerror="alert(1)">\n[bad](data:text/html,test) [private](file:///home/private) [outside](../secret.md) [anchor](#title) [canvas](/personal/#/home)\n![local](/home/me/private.png)\n';
  const html = await renderDocument(Buffer.from(input), 'x.md');
  assert.doesNotMatch(html, /<script|<iframe|<svg|<img|onclick|onerror|style=|javascript:|data:text|file:\/\/|href="\.\./);
  assert.match(html, /href="#doc-title"/); assert.match(html, /id="doc-title"/); assert.match(html, /href="\/personal\/#\/home"/);
  const refs = fileReferences([page([{ ...element('next.org'), id: 'next' }])]);
  const linked = await renderDocument(Buffer.from('[next](next.org) [unknown](unknown.org)'), 'x.md', refs);
  assert.match(linked, /href="\/personal\/assets\/file-.*\.org.zip"/); assert.doesNotMatch(linked, /href="unknown/);
  assert.doesNotMatch(await renderDocument(Buffer.from('#+begin_export html\n<script>alert(1)</script>\n#+end_export'), 'x.org'), /<script/);
});

test('file validation and safe ZIP packaging preserve exact bytes including active formats and front matter', () => {
  for (const name of ['../a.md','a/b.md','a\\b.md','a\0.md','.','..']) assert.throws(() => validateFile(Buffer.from('x'), name));
  for (const name of ['photo.png','photo.jpg','movie.mp4','movie.webm','book.pdf','archive.zip']) assert.throws(() => validateFile(Buffer.from('<html>fake</html>'), name), /bytes do not match/);
  assert.throws(() => validateFile(Buffer.from([255,0]), 'bad.md'), /UTF-8/);
  assert.throws(() => validateFile(Buffer.alloc(fileLimit('big.org') + 1), 'big.org'), /limit/);
  for (const name of ['notes.md','active.html','drawing.svg','program.c','unknown.xyz']) {
    const bytes = Buffer.from('---\nlayout: test\n---\n<script>alert(1)</script>\n{{ site.secret }}');
    validateFile(bytes, name);
    const zip = packageFile(bytes, name); assert.deepEqual(zip, packageFile(bytes, name));
    assert.deepEqual(Buffer.from(unzipSync(zip)[name]), bytes);
  }
});

test('plain text detection accepts source files and unknown extensions without executing markup', async () => {
  const source = '#include <stdio.h>\n\tconst char *text = "<script>alert(1)</script> & *literal*";\n';
  for (const name of ['program.c','code.s','boot.asm','Makefile','novel.unfamiliar','script.html','drawing.svg']) {
    const bytes = Buffer.from(source);
    assert.equal(isPlainText(bytes), true);
    assert.equal(fileKind(name, true), 'text');
    const html = await renderDocument(bytes, name);
    assert.match(html, /<pre class="plain-text">/);
    assert.match(html, /&lt;stdio.h&gt;/); assert.match(html, /&lt;script&gt;/);
    assert.doesNotMatch(html, /<script>|<strong>|<h1/);
    validatePage(page([{...element(name),plainText:true}]));
  }
  assert.equal(fileKind('code.s'), 'text', 'existing assembly attachments can switch to Render');
  assert.equal(fileKind('unknown.bytes', false), 'attachment');
  assert.equal(decodeText(Buffer.concat([Buffer.from([255,254]),Buffer.from('Text λ\n', 'utf16le')])), 'Text λ\n');
  assert.equal(isPlainText(Buffer.from([255,254,0,1,255])), false);
  for (const bytes of [Buffer.from([0,1,2]), Buffer.from([255,128]), Buffer.alloc(TEXT_LIMIT+1,65)]) {
    assert.equal(isPlainText(bytes), false); await assert.rejects(renderDocument(bytes,'binary.dat'));
  }
});

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zibaldone-files-test-'));
  for (const dir of ['assets','client','pages']) await cp(path.join(source,dir),path.join(root,dir),{recursive:true});
  t.after(() => rm(root,{recursive:true,force:true})); return root;
}
test('authorized import, immutable source replacement, safe downloads, range requests and static builds', async t => {
  const root = await fixture(t), server = createSpaceServer({root});
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve)); t.after(() => new Promise(r => server.close(r)));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const html = await (await fetch(origin+'/personal/?edit5500')).text();
  const token = html.match(/name="zibaldone-editor-token" content="([^"]+)"/)[1];
  const upload = (name, bytes, extra={}) => fetch(origin+'/_zibaldone/api/files',{method:'POST',headers:{'X-Zibaldone-Token':token,'X-Zibaldone-Filename':encodeURIComponent(name),...extra},body:bytes});
  assert.equal((await fetch(origin+'/_zibaldone/api/files',{method:'POST',body:'bad'})).status,403);
  assert.equal((await upload('a.org','* Hello',{Origin:'https://evil.test'})).status,403);
  assert.equal((await upload('../a.org','* Hello')).status,400);
  assert.equal((await upload('fake.png','not a png')).status,400);
  const original=Buffer.from('#+TITLE: Original\n* Hello\n*bold* text');
  const imported = await (await upload('notes.org', original)).json();
  assert.deepEqual(await readFile(path.join(root,'assets',path.basename(imported.src))), original);
  const newer = await (await upload('notes.org',Buffer.from('* Replacement'))).json(); assert.notEqual(imported.src,newer.src);
  const e={...element(),...imported}; await writeFile(path.join(root,'pages/home.json'),JSON.stringify(page([e])));
  const documentURL=imported.src.replace('/assets/','/documents/')+'.html';
  assert.match(await (await fetch(origin+documentURL)).text(), /<strong>bold/);
  const zipped=Buffer.from(await (await fetch(origin+downloadPath(e))).arrayBuffer()); assert.deepEqual(Buffer.from(unzipSync(zipped)['notes.org']),original);
  assert.equal((await fetch(origin+imported.src)).status,404);
  const unsafe=await (await upload('active.html',Buffer.from('<script>alert(1)</script>'))).json();
  assert.equal(unsafe.plainText,true);
  assert.equal((await fetch(origin+unsafe.src)).status,404);
  const assembly=await (await upload('code.s',Buffer.from('.text\nmain:\n\tmov $1, %rax\n'))).json();
  const unknown=await (await upload('notes.unusual',Buffer.from('<b>literal source</b>'))).json();
  const binary=await (await upload('blob.dat',Buffer.from([0,1,255,12]))).json();
  assert.equal(assembly.plainText,true);assert.equal(unknown.plainText,true);assert.equal(binary.plainText,false);
  // Preview before autosaving metadata is safe even for an unfamiliar extension.
  const preview=unknown.src.replace('/assets/','/documents/')+'.html';
  assert.match(await (await fetch(origin+preview)).text(), /&lt;b&gt;literal source&lt;\/b&gt;/);
  await writeFile(path.join(root,'pages/home.json'),JSON.stringify(page([e,
    {...element('code.s'),...assembly,id:'assembly'}, {...element('notes.unusual'),...unknown,id:'unknown'},
    {...element('blob.dat'),...binary,id:'binary',display:'attach'}])));
  const movie=Buffer.concat([Buffer.from([0,0,0,24]),Buffer.from('ftypisom'),Buffer.alloc(50)]);
  const media=await (await upload('movie.mp4',movie)).json();
  const ranged=await fetch(origin+media.src,{headers:{Range:'bytes=4-7'}}); assert.equal(ranged.status,206); assert.equal(await ranged.text(),'ftyp');
  const output=await mkdtemp(path.join(os.tmpdir(),'zibaldone-files-built-')); t.after(()=>rm(output,{recursive:true,force:true}));
  await build({source:root,output,basePath:'/repo/personal/'});
  assert.match(await readFile(path.join(output,'documents',path.basename(imported.src)+'.html'),'utf8'),/<h1/);
  assert.match(await readFile(path.join(output,'documents',path.basename(assembly.src)+'.html'),'utf8'), /mov \$1, %rax/);
  assert.match(await readFile(path.join(output,'documents',path.basename(unknown.src)+'.html'),'utf8'), /&lt;b&gt;literal source/);
  assert.deepEqual(Buffer.from(unzipSync(await readFile(path.join(output,'assets',path.basename(imported.src)+'.zip')))['notes.org']),original);
  assert.ok(!(await readdir(path.join(output,'assets'))).includes(path.basename(imported.src)));
  for(const name of ['editor.js','file-editor.js','documents.mjs','files.mjs']) await assert.rejects(readFile(path.join(output,'client',name)));
  await symlink(path.join(root,'pages/home.json'),path.join(root,'assets','symlink.txt'));
  await assert.rejects(build({source:root,output}),/regular files/);
});
