import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, cp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { publishContent, runGit, deploymentURL } from '../publish.mjs';
import { build } from '../build.mjs';
import { fileURLToPath } from 'node:url';
import { createSpaceServer } from '../server.mjs';

const page = { slug: 'home', camera: { x: 0, y: 0, zoom: 1 }, elements: [] };
async function fixture(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'zibaldone-publish-'));
  const repo = path.join(dir, 'repo'), remote = path.join(dir, 'remote.git'), root = path.join(repo, 'zibaldone');
  t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(path.join(root, 'pages'), { recursive: true }); await mkdir(path.join(root, 'assets'));
  await writeFile(path.join(root, 'pages/home.json'), JSON.stringify(page, null, 2) + '\n');
  await writeFile(path.join(root, 'assets/photo.png'), 'original'); await writeFile(path.join(repo, 'README.md'), 'original');
  const source = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  await cp(path.join(source, 'client'), path.join(root, 'client'), { recursive: true });
  await cp(path.join(source, 'build.mjs'), path.join(root, 'build.mjs'));
  await writeFile(path.join(repo, '_config.yml'), 'exclude: [zibaldone]\n');
  await build({ source: root, output: path.join(repo, 'personal') });
  const git = args => runGit(repo, args);
  await runGit(dir, ['init', '--bare', remote]); await git(['init', '-b', 'main']);
  await git(['config', 'user.name', 'Publish Tests']); await git(['config', 'user.email', 'tests@example.invalid']);
  await git(['config', 'commit.gpgSign', 'false']); await git(['config', 'core.hooksPath', path.join(dir, 'no-hooks')]);
  await git(['add', '--', 'README.md', 'zibaldone', 'personal', '_config.yml']);
  await git(['commit', '-m', 'initial']); await git(['remote', 'add', 'origin', remote]); await git(['push', '-u', 'origin', 'main']);
  const head = (await git(['rev-parse', 'HEAD'])).trim();
  const dirty = () => writeFile(path.join(root, 'pages/home.json'), JSON.stringify({ ...page, camera: { ...page.camera, x: 2 } }, null, 2) + '\n');
  return { dir, repo, root, remote, git, head, dirty };
}
const remoteHead = f => runGit(f.remote, ['rev-parse', 'refs/heads/main']).then(s => s.trim());

test('publish stages only content additions/modifications/deletions and commits content. to the configured upstream', async t => {
  const f = await fixture(t); await f.dirty();
  await writeFile(path.join(f.root, 'pages/new.json'), JSON.stringify({ ...page, slug: 'new' }));
  await writeFile(path.join(f.root, 'assets/new.webp'), 'new image');
  await rm(path.join(f.root, 'assets/photo.png'));
  await writeFile(path.join(f.repo, 'README.md'), 'unrelated unstaged work');
  await writeFile(path.join(f.repo, 'private.txt'), 'untracked unrelated work');
  const events = [], result = await publishContent(f.root, e => events.push(e.state));
  assert.equal(result.state, 'success'); assert.match(result.commit, /^[0-9a-f]{8}$/);
  assert.deepEqual(events, ['building', 'committing', 'pushing']);
  const head = (await f.git(['rev-parse', 'HEAD'])).trim(); assert.equal(await remoteHead(f), head);
  assert.equal((await f.git(['log', '-1', '--format=%s'])).trim(), 'content.');
  assert.deepEqual((await f.git(['diff', '--name-only', '--no-renames', f.head, head])).trim().split('\n').filter(name => !name.startsWith('personal/')).sort(), ['zibaldone/assets/new.webp', 'zibaldone/assets/photo.png', 'zibaldone/pages/home.json', 'zibaldone/pages/new.json']);
  assert.equal(await f.git(['show', 'HEAD:README.md']), 'original');
  assert.match(await f.git(['status', '--porcelain']), /README.md/); assert.match(await f.git(['status', '--porcelain']), /private.txt/);
  assert.equal((await publishContent(f.root)).state, 'nothing'); assert.equal((await f.git(['rev-parse', 'HEAD'])).trim(), head);
});

test('no changes creates no commit or network request; unrelated staged changes stop without touching the index', async t => {
  const f = await fixture(t);
  assert.equal((await publishContent(f.root, () => {}, (cwd, args) => {
    assert.ok(!['ls-remote', 'push'].includes(args[0])); return runGit(cwd, args);
  })).state, 'nothing');
  await f.dirty(); await writeFile(path.join(f.repo, 'README.md'), 'staged unrelated work');
  await f.git(['add', '--', 'README.md']);
  const before = await f.git(['diff', '--cached', '--binary']);
  await assert.rejects(publishContent(f.root), /Unrelated staged changes/);
  assert.equal(await f.git(['diff', '--cached', '--binary']), before); assert.equal(await remoteHead(f), f.head);
});

test('already staged content is included but unpushed unrelated commits are refused', async t => {
  const f = await fixture(t); await f.dirty(); await f.git(['add', '--', 'zibaldone/pages/home.json']);
  assert.equal((await publishContent(f.root)).state, 'success');
  await writeFile(path.join(f.repo, 'README.md'), 'code change'); await f.git(['add', '--', 'README.md']); await f.git(['commit', '-m', 'unpublished code']);
  const remote = await remoteHead(f); await f.dirty();
  await assert.rejects(publishContent(f.root), /unpushed commits outside/); assert.equal(await remoteHead(f), remote);
});

test('authentication and commit failures are helpful, redact credentials, and never push', async t => {
  const f = await fixture(t); await f.dirty();
  const auth = async (cwd, args) => {
    if (args[0] === 'ls-remote') throw Object.assign(new Error('command failed'), { code: 128, stderr: 'Authentication failed for https://secret-token@github.com/private/repo.git' });
    assert.notEqual(args[0], 'push'); return runGit(cwd, args);
  };
  await assert.rejects(publishContent(f.root, () => {}, auth), e => /authentication/.test(e.message) && !/secret-token/.test(e.message));
  assert.equal((await f.git(['rev-parse', 'HEAD'])).trim(), f.head);
  const badCommit = async (cwd, args) => {
    if (args[0] === 'commit') throw Object.assign(new Error('failed'), { code: 1, stderr: 'signing failed' });
    assert.notEqual(args[0], 'push'); return runGit(cwd, args);
  };
  await assert.rejects(publishContent(f.root, () => {}, badCommit), /Git commit failed/);
  assert.equal((await f.git(['rev-parse', 'HEAD'])).trim(), f.head); assert.equal(await remoteHead(f), f.head);
});

test('a failed push keeps the content commit; a retry pushes it without an empty second commit', async t => {
  const f = await fixture(t); await f.dirty();
  const rejectPush = async (cwd, args) => {
    if (args[0] === 'push') throw Object.assign(new Error('failed'), { code: 128, stderr: 'Permission denied (publickey)' });
    return runGit(cwd, args);
  };
  await assert.rejects(publishContent(f.root, () => {}, rejectPush), /Local commit [a-f0-9]{8} was kept/);
  const committed = (await f.git(['rev-parse', 'HEAD'])).trim(); assert.notEqual(committed, f.head); assert.equal(await remoteHead(f), f.head);
  assert.equal((await publishContent(f.root)).state, 'success'); assert.equal(await remoteHead(f), committed);
  assert.equal((await f.git(['rev-parse', 'HEAD'])).trim(), committed);
});

test('remote advancement is rejected before commit; a race at push remains a non-force failure', async t => {
  const f = await fixture(t); await f.dirty();
  const other = path.join(f.dir, 'other'); await runGit(f.dir, ['clone', '-b', 'main', f.remote, other]);
  await runGit(other, ['config', 'user.name', 'Other']); await runGit(other, ['config', 'user.email', 'other@example.invalid']);
  await runGit(other, ['config', 'commit.gpgSign', 'false']);
  await writeFile(path.join(other, 'README.md'), 'remote changed'); await runGit(other, ['add', '--', 'README.md']); await runGit(other, ['commit', '-m', 'remote']); await runGit(other, ['push']);
  await assert.rejects(publishContent(f.root), /advanced or diverged/);
  assert.equal((await f.git(['rev-parse', 'HEAD'])).trim(), f.head);
  const fresh = await fixture(t); await fresh.dirty();
  await assert.rejects(publishContent(fresh.root, () => {}, async (cwd, args) => {
    if (args[0] === 'push') { assert.ok(!args.some(a => a === '--force' || a.startsWith('+'))); throw Object.assign(new Error('failed'), { code: 1, stderr: '[rejected] main -> main (fetch first)' }); }
    return runGit(cwd, args);
  }), /advanced or diverged/);
});

test('missing Git setup, missing upstream, and simultaneous publishers fail safely', async t => {
  const f = await fixture(t); await f.dirty();
  let release, reached;
  const gate = new Promise(r => { release = r; }), started = new Promise(r => { reached = r; });
  const first = publishContent(f.root, () => {}, async (cwd, args) => { if (args[0] === 'ls-remote') { reached(); await gate; } return runGit(cwd, args); });
  await started;
  try { await assert.rejects(publishContent(f.root), /Another publish/); } finally { release(); }
  await first;
  await f.git(['branch', '--unset-upstream']); await assert.rejects(publishContent(f.root), /upstream branch/);
  const empty = path.join(f.dir, 'no-git/zibaldone'); await mkdir(empty, { recursive: true });
  await assert.rejects(publishContent(empty), /not a Git checkout/);
});

test('GitHub deployment links omit credentials and reject other hosts', () => {
  assert.equal(deploymentURL('git@github.com:owner/repo.git'), 'https://github.com/owner/repo/actions');
  assert.equal(deploymentURL('https://token@github.com/owner/repo.git'), 'https://github.com/owner/repo/actions');
  assert.equal(deploymentURL('ssh://git@github.com/owner/repo.git'), 'https://github.com/owner/repo/actions');
  assert.equal(deploymentURL('https://github.com.evil/owner/repo.git'), null);
  assert.equal(deploymentURL('/tmp/remote.git'), null);
});

test('publishing endpoint requires editor token/origin/host and rejects concurrent publish/save requests', async t => {
  const f = await fixture(t);
  let calls = 0, release, reached;
  const gate = new Promise(r => { release = r; }), started = new Promise(r => { reached = r; });
  const server = createSpaceServer({ root: f.root, publish: async (_root, progress) => { calls++; progress({ state: 'committing' }); reached(); await gate; progress({ state: 'pushing' }); return { state: 'success', commit: '12345678' }; } });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  t.after(() => new Promise(r => server.close(r)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const html = await (await fetch(origin + '/personal/?edit5500')).text();
  const token = html.match(/name="zibaldone-editor-token" content="([^"]+)"/)[1];
  const headers = { 'X-Zibaldone-Token': token };
  assert.equal((await fetch(origin + '/_zibaldone/api/publish', { method: 'POST' })).status, 403);
  assert.equal((await fetch(origin + '/_zibaldone/api/publish', { method: 'POST', headers: { ...headers, Origin: 'https://outside.invalid' } })).status, 403);
  const badHost = await new Promise(resolve => { const req = http.request(origin + '/_zibaldone/api/publish', { method: 'POST', headers: { ...headers, Host: 'outside.invalid' } }, res => { res.resume(); resolve(res.statusCode); }); req.end(); });
  assert.equal(badHost, 403); assert.equal(calls, 0);
  const first = fetch(origin + '/_zibaldone/api/publish', { method: 'POST', headers }); await started;
  try {
    assert.equal((await fetch(origin + '/_zibaldone/api/publish', { method: 'POST', headers })).status, 409);
    assert.equal((await fetch(origin + '/_zibaldone/api/pages/home', { method: 'PUT', headers, body: JSON.stringify(page) })).status, 409);
  } finally { release(); }
  const events = (await (await first).text()).trim().split('\n').map(line => JSON.parse(line));
  assert.deepEqual(events.map(e => e.state), ['committing', 'pushing', 'success']); assert.equal(calls, 1);
});


test('personal builds are validated before staging and independent code/generated edits are rejected', async t => {
  const f = await fixture(t); const original = await readFile(path.join(f.repo, 'personal/pages/home.json'));
  await writeFile(path.join(f.root, 'pages/home.json'), JSON.stringify({ ...page, elements: [{ id: 'bad', type: 'text', x: 0, y: 0, width: 4, height: 2, text: 'missing', font: 'mono', fontSize: 16, href: '/space/missing/' }] }));
  await assert.rejects(publishContent(f.root), /Personal build failed:.*missing canvas/);
  assert.deepEqual(await readFile(path.join(f.repo, 'personal/pages/home.json')), original);
  assert.equal(await f.git(['diff', '--cached', '--name-only']), '');
  await f.dirty();
  await writeFile(path.join(f.repo, 'personal/client/main.js'), 'independent generated edit');
  await assert.rejects(publishContent(f.root), /independent changes/);
  assert.equal(await readFile(path.join(f.repo, 'personal/client/main.js'), 'utf8'), 'independent generated edit');
  await writeFile(path.join(f.root, 'client/main.js'), 'uncommitted code');
  await assert.rejects(publishContent(f.root), /application or configuration/);
  assert.equal(await remoteHead(f), f.head);
});
