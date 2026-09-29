const {markdownReferences}=require('./tools/markdown');
const fs = require('node:fs');
const path = require('node:path');
const matter = require('gray-matter');
const {buildImages, displayVariant} = require('./tools/images');

const SECTIONS = ['home', 'projects', 'notes', 'archive', 'about'];
const AUDIENCES = ['public', 'professional'];
const STATUSES = ['active', 'complete', 'wip', 'paused', 'superseded', 'archived'];
const TYPES = ['home','project','project-note','note','essay','log','collection','archive','about'];
const REQUIRED = ['id', 'title', 'slug', 'section', 'type', 'audience', 'status', 'published', 'created'];
const slash = value => value.split(path.sep).join('/');
function date(value, field, source) {
  const normalized = value instanceof Date ? value.toISOString().slice(0, 10) : value;
  if (typeof normalized !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(normalized) ||
      !Number.isFinite(Date.parse(normalized)) || new Date(normalized).toISOString().slice(0, 10) !== normalized) {
    throw new Error(`${source}: ${field} must be a valid YYYY-MM-DD date`);
  }
  return normalized;
}
function buildManifest(root = __dirname) {
  const pages = [], assetDirectories = {}, ids = new Map(), slugs = new Map();
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name))) {
      if (entry.name.startsWith('.') || entry.name === 'drafts' || entry.name === '_order.json') continue;
      const filename = path.join(dir, entry.name), source = slash(path.relative(root, filename));
      if (entry.isDirectory()) { walk(filename); continue; }
      if (!entry.isFile()) continue;
      if (!/\.md$/i.test(entry.name)) {
        (assetDirectories[slash(path.relative(root, dir))] ||= []).push(entry.name);
        continue;
      }
      let parsed;
      try { parsed = matter(fs.readFileSync(filename, 'utf8')); }
      catch (error) { throw new Error(`${source}: invalid YAML frontmatter: ${error.message}`); }
      const data = parsed.data;
      if (data.published === false) continue;
      for (const key of REQUIRED) {
        if (data[key] === undefined || data[key] === null || data[key] === '') throw new Error(`${source}: missing required metadata "${key}"`);
      }
      for (const key of ['id', 'title', 'slug', 'type']) {
        if (typeof data[key] !== 'string') throw new Error(`${source}: ${key} must be a string`);
      }
      if (!/^[a-z0-9]+(?:[a-z0-9/-]*[a-z0-9])?$/.test(data.slug) || data.slug.includes('//')) throw new Error(`${source}: invalid semantic slug "${data.slug}"`);
      if (!/^[a-z0-9][a-z0-9-]*$/.test(data.id)) throw new Error(`${source}: invalid id "${data.id}"`);
      if (!SECTIONS.includes(data.section)) throw new Error(`${source}: invalid section "${data.section}"`);
      if (!Array.isArray(data.audience) || !data.audience.length || data.audience.some(a => !AUDIENCES.includes(a))) throw new Error(`${source}: invalid audience; expected public and/or professional`);
      if (!TYPES.includes(data.type)) throw new Error(`${source}: invalid type "${data.type}"`);
      if (!STATUSES.includes(data.status)) throw new Error(`${source}: invalid status "${data.status}"`);
      if (data.published !== true) throw new Error(`${source}: published must be a boolean`);
      for (const [field, seen] of [['id', ids], ['slug', slugs]]) {
        if (seen.has(data[field])) throw new Error(`${source}: duplicate ${field} "${data[field]}" (also in ${seen.get(data[field])})`);
        seen.set(data[field], source);
      }
      if (data.topics !== undefined && (!Array.isArray(data.topics) || data.topics.some(t => typeof t !== 'string'))) throw new Error(`${source}: topics must be a string array`);
      if (data.order !== undefined && !Number.isFinite(data.order)) throw new Error(`${source}: order must be a number`);
      const created = date(data.created, 'created', source);
      pages.push({ ...data, created, modified: date(data.modified ?? created, 'modified', source),
        project: data.project || null, collection: data.collection || null, topics: data.topics || [],
        featured: data.featured ?? false, order: data.order ?? 100, summary: data.summary || '',
        banner: data.banner || null, sound: data.sound || null, authorSource: source, source: `generated/pages/${data.id}.md`,
        assetBase: slash(path.relative(root, dir)), body: parsed.content });
    }
  }
  walk(path.join(root, 'content'));
  const aliasPath = path.join(root, 'legacy-routes.json');
  let aliases = fs.existsSync(aliasPath) ? JSON.parse(fs.readFileSync(aliasPath, 'utf8')) : {};
  // Unpublishing a page also removes its aliases from the public manifest.
  aliases = Object.fromEntries(Object.entries(aliases).filter(([, slug]) => slugs.has(slug)));
  return { generatedAt: new Date().toISOString(), pages, assetDirectories, aliases };
}
async function build(root = __dirname) {
  const manifest = buildManifest(root);
  const shell = fs.readFileSync(path.join(root, 'site.shell.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
  const images = await buildImages(root, manifest, shell, css);
  fs.writeFileSync(path.join(root, 'generated/image-index.json'),JSON.stringify(images));
  for(const page of manifest.pages) {
    // Page-local metadata only: no download of the archive's image index at runtime.
    const references = [page.banner,...markdownReferences(page.body).images.map(image=>image.href),...[...page.body.matchAll(/<img[^>]*src=["']([^"']+)/g)].map(m=>m[1])].filter(Boolean);
    const wanted = new Set(references.filter(ref=>!/^https?:/.test(ref)).map(ref=>path.posix.normalize(`${page.assetBase}/${ref.split('#')[0]}`)));
    for(const match of page.body.matchAll(/images\{([^}]+)\}/g)) {
      const folder=path.posix.normalize(`${page.assetBase}/${match[1].split(',')[0].trim()}`).replace(/\/$/,'');
      for(const filename of manifest.assetDirectories[folder]||[])wanted.add(`${folder}/${filename}`);
    }
    const selected = Object.fromEntries(Object.entries(images).filter(([src])=>wanted.has(src)).map(([src,item])=>[src,{...item,original:src}]));
    const dest = `generated/images/${page.id}.json`;
    fs.writeFileSync(path.join(root,dest),JSON.stringify(selected));
    page.images = dest;
  }
  let optimizedCss = css.replace(/url\((["']?)(assets\/[^"')]+)\1\)/g,(match,q,src)=>images[src]?`url('../${displayVariant(images[src], src.includes('noise')?600:1200).src}')`:match.replace('assets/','../assets/'));
  fs.writeFileSync(path.join(root,'generated/site.css'),optimizedCss);
  const vendor = path.join(root,'generated/vendor');fs.mkdirSync(vendor,{recursive:true});
  const copy=(src,dest)=>fs.copyFileSync(path.join(__dirname,'node_modules',src),path.join(vendor,dest));
  copy('marked/lib/marked.umd.js','marked.js');
  copy('papaparse/papaparse.min.js','papaparse.js');
  copy('photoswipe/dist/photoswipe.esm.min.js','photoswipe.js');
  copy('photoswipe/dist/photoswipe.css','photoswipe.css');
  for(const family of ['jetbrains-mono','azeret-mono']) {
    copy(`@fontsource/${family}/files/${family}-latin-400-normal.woff2`,`${family}.woff2`);
    copy(`@fontsource/${family}/LICENSE`,`${family}-LICENSE.txt`);
  }
  for(const [pkg,name] of [['photoswipe','LICENSE'],['marked','LICENSE'],['papaparse','LICENSE']]) copy(`${pkg}/${name}`,`${pkg}-LICENSE.txt`);

  const output = path.join(root, 'generated/pages');
  fs.mkdirSync(output, { recursive: true });
  const expected = new Set(manifest.pages.map(page => path.basename(page.source)));
  for (const name of fs.readdirSync(output)) {
    if (name.endsWith('.md') && !expected.has(name)) fs.unlinkSync(path.join(output, name));
  }
  manifest.pages = manifest.pages.map(({ body, ...page }) => {
    fs.writeFileSync(path.join(root, page.source), body);
    return page;
  });
  fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  const optimizedShell = shell.replace(/<img([^>]*?)src="(assets\/[^"]+)"([^>]*)>/g,(tag,before,src,after)=>{
    const item=images[src];if(!item)return tag;
    const variant=displayVariant(item,src.includes('theoprins')?1200:600);
    const image = `<img${before}src="${variant.src}" width="${item.width}" height="${item.height}" decoding="async"${after}>`;
    return tag.includes('data-desktop') ? `<picture><source media="(min-width: 901px) and (pointer: fine)" srcset="${variant.src}">${image.replace(`src="${variant.src}"`, 'src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="')}</picture>` : image;
  });
  fs.writeFileSync(path.join(root,'index.html'),optimizedShell);
  fs.mkdirSync(path.join(root, 'work'), { recursive: true });
  fs.writeFileSync(path.join(root, 'work/index.html'), optimizedShell.replace('<head>', '<head>\n  <!-- Generated by npm run build; edit site.shell.html instead. -->\n  <base href="../">'));
  console.log(`manifest.json generated: ${manifest.pages.length} published pages`);
  return manifest;
}
if (require.main === module) {
  build().catch(error => { console.error(`Build failed: ${error.message}`); process.exitCode = 1; });
}
module.exports = { buildManifest, build };
