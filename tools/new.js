const fs = require('node:fs');
const path = require('node:path');
const matter = require('gray-matter');
const {buildManifest, build} = require('../build');

const sections = {home:'home', project:'projects', 'project-note':'projects', note:'notes', essay:'notes', log:'notes', collection:'notes', archive:'archive', about:'about', currents:'currents'};
const usage = `Usage:
  npm run new -- project "Project name"
  npm run new -- archive "Archive title" [--collection ideas]
  npm run new -- note "Note title" [--collection mindfill]
  npm run new -- project-note "Design log" --project zion

The flag form also works: npm run new -- --type project --title "ZION"
Projects appear in both views. Notes and archives appear in /personal/.
Project notes inherit their project's audience.
Use --audience public for a personal-only project.
Titles keep their capitalization; folder names and URLs are lowercase.
Creation rebuilds the site. Run npm run dev for live editing.`;

function parseArgs(args) {
  const options = {}, positional = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') { options.help = true; continue; }
    if (!arg.startsWith('-')) { positional.push(arg); continue; }
    if (!['--type', '--title', '--collection', '--project', '--audience'].includes(arg)) throw new Error(`Unknown option: ${arg}\n${usage}`);
    if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Missing value for ${arg}.\n${usage}`);
    const key = arg.slice(2);
    if (options[key] !== undefined) throw new Error(`Repeated option: ${arg}`);
    options[key] = args[++i];
  }
  if (!options.type && positional.length) options.type = positional.shift();
  if (positional.length) {
    if (options.title !== undefined) throw new Error(`Give the title once, either positionally or with --title.\n${usage}`);
    options.title = positional.join(' ');
  }
  return options;
}

function scaffold(root, options) {
  const type = options.type || 'note', title = options.title?.trim();
  if (!Object.hasOwn(sections, type)) throw new Error(`Unknown type: ${type}\n${usage}`);
  if (!title) throw new Error(`A title is required.\n${usage}`);
  const name = title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!name) throw new Error('Please include an ASCII title or use an ASCII title and edit it afterward.');
  const section = sections[type];
  if (options.collection && options.project) throw new Error('Choose either --collection or --project, not both.');
  const group = options.collection || options.project;
  if (group && !/^[a-z0-9][a-z0-9-]*$/.test(group)) throw new Error('Collection/project must be a lowercase hyphenated identifier.');
  if (options.project && type !== 'project-note') throw new Error('--project is for project-note pages; a new project uses its title as its ID.');
  if (options.collection && !['notes', 'archive'].includes(section)) throw new Error('--collection is for notes and archive entries.');
  if (type === 'project-note' && !options.project) throw new Error('A project note needs --project <existing-project-id>.');
  const manifest = buildManifest(root);
  const parent = type === 'project-note' ? manifest.pages.find(p => p.type === 'project' && p.project === options.project) : null;
  if (type === 'project-note' && !parent) throw new Error(`Unknown published project: ${options.project}. Create it with npm run new -- project "Project name" first.`);
  const audience = options.audience === undefined
    ? (parent?.audience.slice() || (type === 'project' ? ['public', 'professional'] : ['public']))
    : [...new Set(options.audience.split(',').map(value => value.trim()))];
  if (!audience.length || audience.some(value => !['public', 'professional'].includes(value))) throw new Error('--audience must be public, professional, or public,professional.');
  const configFile = path.join(root, 'site.config.json');
  const navigation = fs.existsSync(configFile) ? JSON.parse(fs.readFileSync(configFile, 'utf8')).views?.root?.navigation : null;
  if (audience.includes('professional') && navigation && !navigation.includes(section)) throw new Error(`The professional view does not include ${section}. Use --audience public, or add "${section}" to views.root.navigation in site.config.json.`);
  const slug = type === 'project' ? `projects/${name}` : [section, group, name].filter(Boolean).join('/');
  const id = slug.replaceAll('/', '-');
  if (manifest.pages.some(p => p.id === id || p.slug === slug)) throw new Error(`A page already uses ${id} or ${slug}.`);
  if (manifest.aliases[slug]) throw new Error(`The route ${slug} is an existing alias for ${manifest.aliases[slug]}. Choose a different title.`);
  const folder = type === 'project' ? `content/projects/${name}` : [`content/${section}`, group].filter(Boolean).join('/');
  const dest = path.join(root, folder, type === 'project' ? 'index.md' : `${name}.md`);
  const data = {id, title, slug, section, type, topics:[], audience, status:'wip', published:true, created:new Date().toISOString().slice(0, 10)};
  if (type === 'project') Object.assign(data, {project:name, layout:'project', navTitle:'Overview', order:10});
  else if (parent) Object.assign(data, {project:options.project, layout:'project'});
  else if (options.collection) data.collection = options.collection;
  // Follow the project's actual folder, even after it has been moved.
  const target = parent ? path.join(root, parent.assetBase, `${name}.md`) : dest;
  if (fs.existsSync(target)) throw new Error(`Already exists: ${target}`);
  fs.mkdirSync(path.join(path.dirname(target), 'assets'), {recursive:true});
  fs.writeFileSync(target, matter.stringify('\n', data), {flag:'wx'});
  return target;
}

async function main(args = process.argv.slice(2), root = path.resolve(__dirname, '..')) {
  const options = parseArgs(args);
  if (options.help) { console.log(usage); return; }
  if (!options.title && process.stdin.isTTY) {
    const rl = require('node:readline/promises').createInterface({input:process.stdin, output:process.stdout});
    try { options.title = await rl.question('Title: '); } finally { rl.close(); }
  }
  const dest = scaffold(root, options);
  console.log(`Created ${path.relative(root, dest)}`);
  try { await build(root); }
  catch (error) { throw new Error(`The page was created at ${dest}, but rebuilding failed: ${error.message}\nFix the error and run npm run build; keep editing the same file.`); }
  const {data} = matter(fs.readFileSync(dest, 'utf8'));
  const urls = data.audience.map(audience => `${audience === 'professional' ? '/' : '/personal/'}#/${data.slug}`);
  console.log(`Ready: ${urls.join(' and ')}\nEdit ${path.relative(root, dest)}. Run npm run dev for live preview.`);
  return dest;
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = {scaffold, parseArgs, main};
