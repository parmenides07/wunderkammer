const fs = require('node:fs');
const path = require('node:path');
const matter = require('gray-matter');

const SECTIONS = ['home', 'projects', 'notes', 'archive', 'about'];
const AUDIENCES = ['public', 'professional'];
const STATUSES = ['active', 'complete', 'wip', 'paused', 'superseded', 'archived'];
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
function build(root = __dirname) {
  const manifest = buildManifest(root);
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
  // Single application shell, including support for GitHub Pages project subpaths.
  const shell = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  fs.mkdirSync(path.join(root, 'work'), { recursive: true });
  fs.writeFileSync(path.join(root, 'work/index.html'), shell.replace('<head>', '<head>\n  <!-- Generated by npm run build; edit the root index.html instead. -->\n  <base href="../">'));
  console.log(`manifest.json generated: ${manifest.pages.length} published pages`);
  return manifest;
}
if (require.main === module) {
  try { build(); } catch (error) { console.error(`Build failed: ${error.message}`); process.exitCode = 1; }
}
module.exports = { buildManifest, build };
