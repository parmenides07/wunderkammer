import http from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, readdir, writeFile, rename, lstat, realpath, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { validatePage, slugPattern } from './client/model.js';
import { pageHTML } from './template.mjs';
import { readContent } from './build.mjs';
import { routeURL } from './client/routes.js';
import { publishContent } from './publish.mjs';

const sourceRoot = path.dirname(fileURLToPath(import.meta.url));
const types = { '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.ttf': 'font/ttf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' };
Object.assign(types, { '.html': 'text/html', '.md': 'text/plain', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.csv': 'text/csv', '.mp4': 'video/mp4', '.webm': 'video/webm', '.pdf': 'application/pdf', '.mjs': 'text/javascript', '.wasm': 'application/wasm' });
const etag = data => `"${createHash('sha256').update(data).digest('hex')}"`;
const problem = (message, status = 400) => Object.assign(new Error(message), { status });

async function body(request, limit) {
  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > limit) throw problem(`File exceeds the ${limit / 1024 / 1024} MB limit.`, 413);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function imageExtension(buffer) {
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return '.png';
  if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return '.jpg';
  if (['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6))) return '.gif';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return '.webp';
  throw problem('Choose a PNG, JPEG, GIF, or WebP image.');
}

export function createSpaceServer({ root = sourceRoot, publish = publishContent } = {}) {
  if (process.env.NODE_ENV === 'production') throw new Error('The authoring server is development-only. Build and serve dist/ instead.');
  const token = randomBytes(32).toString('hex');
  let publishing = false;
  let writeQueue = Promise.resolve();
  const serialize = operation => {
    const next = writeQueue.then(operation);
    writeQueue = next.catch(() => {});
    return next;
  };
  async function safeDirectory(name) {
    const directory = path.join(root, name);
    await mkdir(directory, { recursive: true });
    if ((await lstat(directory)).isSymbolicLink() || await realpath(directory) !== path.join(await realpath(root), name))
      throw problem('Content directories must be real directories inside zibaldone/.', 403);
    return directory;
  }
  const server = http.createServer(async (request, response) => {
    const send = (status, value, type = 'application/json', extra = {}) => {
      response.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra });
      response.end(type === 'application/json' && !Buffer.isBuffer(value) ? JSON.stringify(value) : value);
    };
    try {
      const port = server.address().port;
      const allowedHosts = [`127.0.0.1:${port}`, `localhost:${port}`];
      if (!allowedHosts.includes(request.headers.host)) throw problem('Use the localhost authoring URL.', 403);
      const origin = `http://${request.headers.host}`;
      if (request.headers.origin && request.headers.origin !== origin) throw problem('Cross-origin requests are not allowed.', 403);
      const url = new URL(request.url, origin);
      if (url.pathname.startsWith('/_zibaldone/api/')) {
        if (request.headers['x-zibaldone-token'] !== token) throw problem('Open the development editor to use the authoring API.', 403);
        if (url.pathname === '/_zibaldone/api/publish' && request.method === 'POST') {
          if (publishing) throw problem('Another publish is already running. Wait for it to finish.', 409);
          publishing = true;
          return await serialize(async () => {
            response.writeHead(200, { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
            const progress = event => { if (!response.destroyed) response.write(JSON.stringify(event) + '\n'); };
            try { progress(await publish(root, progress)); }
            catch (error) { progress({ state: 'error', error: error.message, actionsURL: error.actionsURL }); }
            finally { publishing = false; response.end(); }
          });
        }
        if (publishing && request.method !== 'GET') throw problem('Publishing is in progress. Wait before saving or adding images.', 409);
        if (url.pathname === '/_zibaldone/api/pages' && request.method === 'GET') {
          const entries = await readdir(await safeDirectory('pages'));
          return send(200, entries.filter(x => x.endsWith('.json')).map(x => x.slice(0, -5)).sort());
        }
        const match = url.pathname.match(/^\/_zibaldone\/api\/pages\/([a-z0-9-]+)$/);
        if (match && request.method === 'PUT') {
          if (!slugPattern.test(match[1]) || match[1].length > 80) throw problem('Invalid slug.');
          let page;
          try { page = validatePage(JSON.parse(await body(request, 2 * 1024 * 1024)), match[1]); }
          catch (error) { throw problem(error.message, error.status || 400); }
          if (publishing) throw problem('Publishing is in progress. Wait before saving.', 409);
          return await serialize(async () => {
            const directory = await safeDirectory('pages');
            const file = path.join(directory, `${page.slug}.json`);
            let existing;
            try {
              if ((await lstat(file)).isSymbolicLink()) throw problem('Cannot write through a symlink.', 403);
              existing = await readFile(file);
            } catch (error) { if (error.code !== 'ENOENT') throw error; }
            if (existing ? request.headers['if-match'] !== etag(existing) : request.headers['if-none-match'] !== '*')
              throw problem('This page changed on disk or already exists. Keep this tab open, copy any unsaved text, and reload before saving again.', 409);
            const bytes = JSON.stringify(page, null, 2) + '\n';
            const temporary = path.join(directory, `.${page.slug}-${randomUUID()}.tmp`);
            await writeFile(temporary, bytes, { flag: 'wx' });
            await rename(temporary, file);
            return send(200, { saved: true, revision: etag(bytes) });
          });
        }
        if (url.pathname === '/_zibaldone/api/images' && request.method === 'POST') {
          const bytes = await body(request, 20 * 1024 * 1024);
          const extension = imageExtension(bytes);
          const name = `image-${randomUUID()}${extension}`;
          if (publishing) throw problem('Publishing is in progress. Wait before adding images.', 409);
          await serialize(async () => writeFile(path.join(await safeDirectory('assets'), name), bytes, { flag: 'wx' }));
          return send(201, { src: `/personal/assets/${name}` });
        }
        throw problem('Unknown authoring operation.', 404);
      }
      if (!['GET', 'HEAD'].includes(request.method)) throw problem('Read-only route.', 405);
      const oldPage = url.pathname.match(/^\/zibaldone(?:\/([a-z0-9-]+))?\/?$/);
      if (oldPage) { response.writeHead(302, { Location: routeURL([oldPage[1] || 'home'], '/personal/', url.searchParams.has('edit5500')) }); return response.end(); }
      if (['/personal', '/personal/', '/personal/index.html'].includes(url.pathname)) {
        if (url.pathname === '/personal') { response.writeHead(302, { Location: '/personal/' + url.search }); return response.end(); }
        return send(200, pageHTML('home', url.searchParams.has('edit5500') ? token : '', '/personal/'), 'text/html; charset=utf-8');
      }
      if (url.pathname === '/personal/catalog.json') return send(200, (await readContent(root, '/personal/', false)).catalog);
      // Preview the existing professional output without exposing the source
      // editor or private Markdown. Its separate live-reload workflow is retained.
      if (!url.pathname.startsWith('/personal/')) {
        const project = path.dirname(root);
        let pathname; try { pathname = decodeURIComponent(url.pathname); } catch { throw problem('Invalid URL.'); }
        const relative = pathname.replace(/^\//, '') || 'index.html';
        const allowed = ['index.html', 'manifest.json', 'site.config.json', 'style.css', 'script.js', 'CNAME'].includes(relative) ||
          /^(?:assets|generated|js|work)\//.test(relative) || /^content\//.test(relative) && !/\.(?:md|html)$/i.test(relative) && !relative.startsWith('content/drafts/');
        if (!allowed || relative.split('/').some(part => part.startsWith('.'))) throw problem('Not found.', 404);
        let file = path.join(project, relative);
        if ((await lstat(file)).isDirectory()) file = path.join(file, 'index.html');
        if (!(await realpath(file)).startsWith((await realpath(project)) + path.sep)) throw problem('Invalid path.', 403);
        const stat = await lstat(file), headers = { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Content-Length': stat.size };
        let start = 0, end = stat.size - 1, code = 200;
        if (/\.(pdf|mp4|webm)$/i.test(file)) {
          headers['Accept-Ranges'] = 'bytes';
          if (request.headers.range) {
            const match = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
            if (!match || !match[1] && !match[2]) throw problem('Invalid range.', 416);
            start = match[1] ? Number(match[1]) : Math.max(0, stat.size - Number(match[2]));
            end = match[1] && match[2] ? Math.min(Number(match[2]), end) : end;
            if (start > end || start >= stat.size) throw problem('Invalid range.', 416);
            code = 206; headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`; headers['Content-Length'] = end - start + 1;
          }
        }
        response.writeHead(code, headers);
        if (request.method === 'HEAD') return response.end();
        return createReadStream(file, { start, end: Math.max(0, end) }).pipe(response);
      }
      const fileMatch = url.pathname.match(/^\/personal\/(client|assets|pages)\/([a-zA-Z0-9_.-]+)$/);
      if (!fileMatch) throw problem('Not found. The personal website lives at /personal/.', 404);
      const extension = path.extname(fileMatch[2]);
      if (!types[extension]) throw problem('Not found.', 404);
      const directory = path.join(root, fileMatch[1]);
      const file = path.join(directory, fileMatch[2]);
      if (!(await realpath(file)).startsWith((await realpath(directory)) + path.sep)) throw problem('Invalid asset path.', 403);
      const bytes = await readFile(file);
      return send(200, bytes, types[extension], { ETag: etag(bytes) });
    } catch (error) {
      const status = error.status || (error.code === 'ENOENT' ? 404 : 500);
      send(status, { error: status === 500 ? 'Local file operation failed. Check directory permissions and available disk space.' : error.message });
    }
  });
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4173);
  const server = createSpaceServer();
  server.listen(port, '127.0.0.1', () => {
    console.log(`Viewer: http://127.0.0.1:${server.address().port}/personal/#/home`);
    console.log(`Editor: http://127.0.0.1:${server.address().port}/personal/?edit5500#/home`);
  });
}
