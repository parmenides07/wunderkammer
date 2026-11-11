const canvasReady = require('./navigation.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const execute = promisify(execFile);

module.exports = async ({ browser, source }) => {
  const directory = await fs.mkdtemp('/tmp/zibaldone-publish-browser-');
  const repo = path.join(directory, 'repo'), root = path.join(repo, 'zibaldone'), remote = path.join(directory, 'remote.git');
  let server, context, releasePush;
  const git = async args => (await execute('git', args, { cwd: repo, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } })).stdout.trim();
  try {
    await fs.mkdir(repo); await fs.mkdir(root);
    for (const folder of ['client', 'assets']) await fs.cp(path.join(source, folder), path.join(root, folder), { recursive: true });
    await fs.mkdir(path.join(root, 'pages'));
    const composition = { slug: 'home', camera: { x: 0, y: 0, zoom: 1 }, elements: [{ id: 'note', type: 'text', x: -6, y: -4, width: 12, height: 4, text: 'Before', font: 'mono', fontSize: 16 }] };
    await fs.writeFile(path.join(root, 'pages/home.json'), JSON.stringify(composition, null, 2) + '\n');
    await fs.cp(path.join(source, 'build.mjs'), path.join(root, 'build.mjs'));
    await fs.writeFile(path.join(repo, '_config.yml'), 'exclude: [zibaldone]\n');
    await (await import(path.join(source, 'build.mjs'))).build({ source: root, output: path.join(repo, 'personal') });
    await fs.writeFile(path.join(repo, 'README.md'), 'Initial project');
    await git(['init', '-b', 'main']); await git(['config', 'user.name', 'Browser Tests']); await git(['config', 'user.email', 'test@example.invalid']);
    await git(['config', 'commit.gpgSign', 'false']); await git(['config', 'core.hooksPath', path.join(directory, 'no-hooks')]);
    await git(['add', '--', 'zibaldone', 'personal', '_config.yml', 'README.md']); await git(['commit', '-m', 'initial']);
    await git(['init', '--bare', remote]); await git(['remote', 'add', 'origin', remote]); await git(['push', '-u', 'origin', 'main']);
    const { createSpaceServer } = await import(path.join(source, 'server.mjs'));
    const { publishContent, runGit } = await import(path.join(source, 'publish.mjs'));
    let mode = '', pushGate;
    server = createSpaceServer({ root, publish: (root, progress) => publishContent(root, progress, async (cwd, args) => {
      if (mode === 'auth' && args[0] === 'ls-remote') throw Object.assign(new Error('Authentication failed'), { code: 128, stderr: 'Authentication failed for https://secret@github.com/private/repo.git' });
      if (mode === 'hold' && args[0] === 'push') await pushGate;
      return runGit(cwd, args);
    }) });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => dialog.accept());
    let publishRequests = 0;
    page.on('request', request => { if (request.url().endsWith('/_zibaldone/api/publish')) publishRequests++; });
    await page.goto(origin + '/personal/?edit5500'); await canvasReady(page); await page.waitForSelector('#publish-page');
    const status = page.locator('#save-status'), button = page.locator('#publish-page');
    const waitStatus = pattern => page.waitForFunction(source => new RegExp(source).test(document.querySelector('#save-status').textContent), pattern);
    const edit = async text => { await page.locator('[data-id=note] .content').dblclick(); await page.keyboard.press('Control+a'); await page.keyboard.insertText(text); await page.keyboard.press('Escape'); };
    await page.evaluate(() => {
      window.publishStatuses = [];
      new MutationObserver(() => window.publishStatuses.push(document.querySelector('#save-status').textContent)).observe(document.querySelector('#save-status'), { childList: true, subtree: true });
    });
    await edit('Published from the browser'); await button.click(); await waitStatus('^Pushed successfully');
    assert.equal((await fs.readFile(path.join(root, 'pages/home.json'), 'utf8')).includes('Published from the browser'), true);
    assert.equal(await git(['log', '-1', '--format=%s']), 'content.');
    assert.equal(await git(['rev-parse', 'HEAD']), (await execute('git', ['rev-parse', 'refs/heads/main'], { cwd: remote })).stdout.trim());
    const events = await page.evaluate(() => window.publishStatuses);
    for (const state of ['Saving…', 'Building…', 'Committing…', 'Pushing…']) assert.ok(events.includes(state), state);
    assert.match(await status.textContent(), /not yet confirmed/); assert.equal(await button.isDisabled(), false);
    const firstHead = await git(['rev-parse', 'HEAD']); await button.click(); await waitStatus('^Nothing new to publish$');
    assert.equal(await git(['rev-parse', 'HEAD']), firstHead);

    // Failed save must never issue a publish request or lose the in-memory edit.
    await edit('Unsaved after failed save');
    await page.route('**/_zibaldone/api/pages/home', route => route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'This page changed on disk.' }) }));
    const requestsBeforeFailure = publishRequests;
    await button.click(); await waitStatus('^Publishing failed: This page changed');
    assert.equal(publishRequests, requestsBeforeFailure); assert.equal(await git(['rev-parse', 'HEAD']), firstHead);
    assert.match(await page.locator('[data-id=note]').textContent(), /Unsaved after failed save/);
    assert.equal(await page.locator('#viewport').evaluate(n => n.inert), false);
    await page.unroute('**/_zibaldone/api/pages/home');

    await fs.cp(path.join(source, 'build.mjs'), path.join(root, 'build.mjs'));
    await fs.writeFile(path.join(repo, '_config.yml'), 'exclude: [zibaldone]\n');
    await (await import(path.join(source, 'build.mjs'))).build({ source: root, output: path.join(repo, 'personal') });
    await fs.writeFile(path.join(repo, 'README.md'), 'unrelated staged'); await git(['add', '--', 'README.md']);
    const staged = await git(['diff', '--cached', '--binary']);
    await button.click(); await waitStatus('^Publishing failed: Unrelated staged');
    assert.equal(await git(['diff', '--cached', '--binary']), staged);
    await git(['restore', '--staged', '--', 'README.md']);
    mode = 'auth'; await button.click(); await waitStatus('^Publishing failed: Git authentication');
    assert.doesNotMatch(await status.textContent(), /secret/); assert.equal(await button.isDisabled(), false);
    mode = 'hold'; pushGate = new Promise(resolve => { releasePush = resolve; });
    await button.click(); await waitStatus('^Pushing');
    assert.equal(await button.isDisabled(), true); assert.equal(await button.getAttribute('aria-busy'), 'true');
    assert.equal(await page.locator('#viewport').evaluate(n => n.inert), true);
    const parallel = await page.evaluate(async () => (await fetch('/_zibaldone/api/publish', { method: 'POST', headers: { 'X-Zibaldone-Token': document.querySelector('meta[name=zibaldone-editor-token]').content } })).status);
    assert.equal(parallel, 409); releasePush(); await waitStatus('^Pushed successfully'); mode = '';

    // Publish waits for an already pending file upload, then saves and pushes it.
    let releaseUpload, uploadStarted;
    const uploaded = new Promise(resolve => { uploadStarted = resolve; });
    const uploadGate = new Promise(resolve => { releaseUpload = resolve; });
    await page.route('**/_zibaldone/api/images', async route => { uploadStarted(); await uploadGate; await route.continue(); });
    await page.locator('#image-input').setInputFiles(path.join(root, 'assets/zion.png')); await uploaded;
    const beforeUploadPublish = publishRequests;
    await button.click(); assert.equal(publishRequests, beforeUploadPublish);
    releaseUpload(); await waitStatus('^Pushed successfully'); await page.unroute('**/_zibaldone/api/images');
    const saved = JSON.parse(await fs.readFile(path.join(root, 'pages/home.json'), 'utf8'));
    assert.equal(saved.elements.at(-1).type, 'image');
    assert.match(await git(['show', '--format=', '--name-only', 'HEAD']), /zibaldone\/assets\/image-/);

    // The optional link is deliberately a deployment-status link, never a claim
    // that a successful push has already updated Pages.
    await page.route('**/_zibaldone/api/publish', route => route.fulfill({ contentType: 'application/x-ndjson', body: JSON.stringify({ state: 'success', commit: '12345678', actionsURL: 'https://github.com/owner/repo/actions' }) + '\n' }));
    await button.click(); await waitStatus('^Pushed successfully');
    assert.equal(await page.locator('#deployment-link').getAttribute('href'), 'https://github.com/owner/repo/actions');
    await page.screenshot({ path: '/tmp/zibaldone-publish-editor.png' });
    await page.goto(origin + '/personal/'); await canvasReady(page); await page.waitForSelector('.object');
    assert.equal(await page.locator('#publish-page').count(), 0); assert.deepEqual(errors, []);
    console.log('Publish UI verified: save-before-push, progress, no changes, save failures, staged safety, auth errors, concurrent requests, pending uploads and viewer isolation.');
  } finally {
    releasePush?.(); await context?.close(); if (server) await new Promise(resolve => server.close(resolve));
    await fs.rm(directory, { recursive: true, force: true });
  }
};
