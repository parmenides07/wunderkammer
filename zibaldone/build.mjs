import { cp, mkdir, readFile, readdir, rm, writeFile, rename, lstat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { validatePage, normalizeBasePath, spaceURL } from './client/model.js';
import { internalTarget, routeURL } from './client/routes.js';
import { pageHTML } from './template.mjs';
const root = path.dirname(fileURLToPath(import.meta.url));
export const publicFiles = ['model.js', 'routes.js', 'camera.js', 'main.js', 'style.css', 'trail.js'];
export async function readContent(source = root, basePath = '/personal/', validateReferences = true) {
  const pages = [];
  for (const name of (await readdir(path.join(source, 'pages'))).filter(n => n.endsWith('.json')).sort())
    pages.push(validatePage(JSON.parse(await readFile(path.join(source, 'pages', name), 'utf8')), name.slice(0, -5)));
  if (!pages.some(p => p.slug === 'home')) throw new Error('A home.json canvas is required.');
  const known = new Set(pages.map(p => p.slug));
  if (validateReferences) for (const page of pages) for (const e of page.elements) {
    const target = e.href && internalTarget(e.href, basePath);
    if (target && !known.has(target)) throw new Error(`${page.slug}/${e.id} links to a missing canvas: ${e.href}`);
    if (e.type === 'image') await readFile(path.join(source, 'assets', e.src.split('/assets/')[1]));
  }
  let legacy = {};
  try { legacy = JSON.parse(await readFile(path.join(source, 'legacy-personal.json'), 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  return { pages, catalog: { pages: pages.map(({slug,title,displayName}) => ({slug,title,displayName})), legacy } };
}
export async function build({ source = root, basePath = process.env.ZIBALDONE_BASE_PATH || '/personal/', output = path.join(root, '..', 'personal') } = {}) {
  normalizeBasePath(basePath);
  source = path.resolve(source); output = path.resolve(output);
  if (source === output || source.startsWith(output + path.sep) || output.startsWith(source + path.sep)) throw new Error('Build output must be separate from Zibaldone source.');
  if ((await lstat(output).catch(() => null))?.isSymbolicLink()) throw new Error('Build output cannot be a symlink.');
  const { pages, catalog } = await readContent(source, basePath);
  const stage = output + '.build-' + randomUUID(), backup = output + '.previous-' + randomUUID();
  let moved = false;
  try {
    await mkdir(path.join(stage, 'client'), { recursive: true }); await mkdir(path.join(stage, 'pages'));
    for (const file of publicFiles) await cp(path.join(source, 'client', file), path.join(stage, 'client', file));
    await cp(path.join(source, 'assets'), path.join(stage, 'assets'), { recursive: true, dereference: false });
    for (const page of pages) {
      const publicPage = structuredClone(page);
      for (const e of publicPage.elements) {
        if (e.href) { const target = internalTarget(e.href, basePath); if (target) e.href = routeURL([target], '/personal/'); }
        if (e.src) e.src = spaceURL(e.src, '/personal/');
      }
      await writeFile(path.join(stage, 'pages', page.slug + '.json'), JSON.stringify(publicPage, null, 2) + '\n');
    }
    await writeFile(path.join(stage, 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
    await writeFile(path.join(stage, 'index.html'), pageHTML('home', '', basePath));
    try { await rename(output, backup); moved = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
    try { await rename(stage, output); } catch (error) { if (moved) { await rename(backup, output); moved = false; } throw error; }
    if (moved) await rm(backup, { recursive: true, force: true });
  } finally { await rm(stage, { recursive: true, force: true }); }
  console.log(`Built ${pages.length} read-only canvases in ${output}`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await build();
