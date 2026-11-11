// Local authoring only. This file is deliberately absent from the static build.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, cp, rm, readFile, lstat, open, unlink, access, realpath } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { build } from './build.mjs';

const execute = promisify(execFile);
const folders = ['zibaldone/pages', 'zibaldone/assets', 'personal'];
const contentPath = name => folders.some(folder => name.startsWith(folder + '/'));
const names = output => output.split('\0').filter(Boolean);
const fail = message => { throw new Error(message); };
const exists = file => access(file).then(() => true, () => false);

export async function runGit(cwd, args) {
  const { stdout } = await execute('git', ['-c', 'color.ui=false', ...args], {
    cwd, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, timeout: 120_000,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'Never' },
  });
  return stdout;
}

// Never send raw Git output to the browser: remote URLs/errors can contain credentials.
export function gitError(error, operation) {
  const detail = `${error.stderr || ''}\n${error.message || ''}`;
  if (error.killed || error.code === 'ETIMEDOUT') return 'Git timed out. Check network access, SSH/credential-manager access, signing, and local hooks in a terminal, then retry.';
  if (error.code === 'ENOENT') return 'Git is not installed or is not on the local server’s PATH.';
  if (/non-fast-forward|fetch first|stale info|rejected.*behind/i.test(detail)) return 'The remote branch has advanced or diverged. Fetch and reconcile it manually, then retry. Publish never pulls, rebases, or force pushes.';
  if (/authentication|permission denied|could not read (Username|Password)|terminal prompts disabled|repository not found|access denied/i.test(detail)) return 'Git authentication or repository access failed. Configure local SSH or your Git credential manager and verify access in a terminal, then retry.';
  if (/author identity|committer identity|unable to auto-detect email|empty ident/i.test(detail)) return 'Set git config user.name and user.email locally, then retry.';
  return `Git ${operation} failed. Check the repository, network, signing settings, and Git hooks in a terminal. Saved content is still on disk.`;
}

export function deploymentURL(remote) {
  let pair;
  const scp = remote.match(/^(?:git@)?github\.com:([^\s]+)$/i);
  if (scp) pair = scp[1];
  else {
    try { const url = new URL(remote); if (url.hostname.toLowerCase() === 'github.com') pair = url.pathname.slice(1); } catch { return null; }
  }
  pair = pair?.replace(/\.git\/?$/, '').replace(/\/$/, '');
  return pair && /^[\w.-]+\/[\w.-]+$/.test(pair) ? `https://github.com/${pair}/actions` : null;
}

export async function publishContent(root, progress = () => {}, run = runGit) {
  const cwd = path.dirname(await realpath(root));
  const git = args => run(cwd, args);
  let top;
  try { top = (await git(['rev-parse', '--show-toplevel'])).trim(); }
  catch (error) { if (error.code === 'ENOENT') fail(gitError(error, 'setup')); fail('This folder is not a Git checkout. Set up Git in the project root (containing package.json and zibaldone/), make the initial project commit, and configure an upstream branch.'); }
  if (await realpath(top) !== cwd || path.basename(root) !== 'zibaldone') fail('Publish must run from the project’s own Git checkout containing zibaldone/pages/ and zibaldone/assets/.');
  const gitDir = path.resolve(cwd, (await git(['rev-parse', '--git-common-dir'])).trim());
  const lockPath = path.join(gitDir, 'zibaldone-publish.lock');
  let lock;
  try { lock = await open(lockPath, 'wx'); }
  catch (error) {
    if (error.code === 'EEXIST') fail('Another publish is running. If the authoring server crashed, stop it and remove the stale zibaldone-publish.lock in the Git directory before restarting.');
    fail('Cannot create the local publish lock. Check Git directory permissions.');
  }
  let operation = 'check', commit = null, actionsURL = null;
  try {
    const stateDir = path.resolve(cwd, (await git(['rev-parse', '--absolute-git-dir'])).trim());
    for (const name of ['MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'rebase-merge', 'rebase-apply', 'sequencer'])
      if (await exists(path.join(stateDir, name))) fail('Finish or abort the current merge/rebase/cherry-pick in a terminal before publishing.');
    let branch, head;
    try { branch = (await git(['symbolic-ref', '--quiet', '--short', 'HEAD'])).trim(); head = (await git(['rev-parse', '--verify', 'HEAD'])).trim(); }
    catch { fail('Check out a branch and make the initial project commit before publishing.'); }
    const checkIndex = async () => {
      if ((await git(['ls-files', '--unmerged', '-z'])).length) fail('Resolve the Git index conflicts in a terminal before publishing.');
      const staged = names(await git(['diff', '--cached', '--name-only', '--no-renames', '-z']));
      if (staged.some(name => !contentPath(name))) fail('Unrelated staged changes exist. Commit or unstage those files in a terminal first; Publish only includes zibaldone/pages/, zibaldone/assets/, and generated personal/.');
    };
    await checkIndex();
    let remote, ref, tracking;
    try {
      remote = (await git(['config', '--get', `branch.${branch}.remote`])).trim();
      const refs = (await git(['config', '--get-all', `branch.${branch}.merge`])).trim().split('\n');
      if (refs.length !== 1 || !refs[0].startsWith('refs/heads/') || remote === '.') throw new Error();
      ref = refs[0];
      await git(['check-ref-format', ref]);
      tracking = (await git(['rev-parse', '--verify', '@{upstream}'])).trim();
    } catch { fail('No usable upstream branch is configured. Set the remote and run git push -u <remote> <branch> once in a terminal.'); }
    const urls = (await git(['remote', 'get-url', '--push', '--all', '--', remote])).trim().split('\n');
    if (urls.length !== 1 || !urls[0]) fail('Configure exactly one push destination for the upstream remote before publishing.');
    const remoteURL = urls[0]; actionsURL = deploymentURL(remoteURL);
    // Application changes belong to the reviewed integration/code commit, not
    // an automatic content publish. In particular, do not deploy a half migration.
    try { await git(['ls-files', '--error-unmatch', '--', 'zibaldone/build.mjs', '_config.yml']); }
    catch { fail('Commit and review the initial integration (including zibaldone/ and _config.yml) before using Publish.'); }
    const sourceChanges = names(await git(['diff', '--name-only', '-z', 'HEAD', '--', 'zibaldone']));
    sourceChanges.push(...names(await git(['ls-files', '--others', '--exclude-standard', '-z', '--', 'zibaldone'])));
    if (sourceChanges.some(name => !contentPath(name))) fail('Zibaldone application or configuration files have uncommitted changes. Review and commit those separately before publishing content.');
    const working = await git(['status', '--porcelain=v1', '-z', '--untracked-files=all', '--', ...folders]);
    const ahead = Number((await git(['rev-list', '--count', `${tracking}..${head}`])).trim());
    if (!working && !ahead) return { state: 'nothing', actionsURL };

    operation = 'remote check';
    const advertised = await git(['ls-remote', '--exit-code', '--refs', '--', remoteURL, ref]);
    const remoteHead = advertised.trim().split(/\s+/)[0];
    if (!/^[a-f0-9]{40,64}$/.test(remoteHead)) fail('The upstream branch was not found. Configure and push it once in a terminal.');
    try { await git(['merge-base', '--is-ancestor', remoteHead, head]); }
    catch { fail('The remote branch has advanced or diverged. Fetch and reconcile it manually, then retry. Publish never pulls, rebases, or force pushes.'); }
    // A push also carries earlier commits. Refuse unrelated unpushed work rather
    // than silently publishing code alongside this content-only operation.
    const unpushed = names(await git(['log', '--format=', '--name-only', '--no-renames', '-z', `${remoteHead}..${head}`])).map(name => name.replace(/^\n+/, ''));
    if (unpushed.some(name => name && !contentPath(name))) fail('This branch has unpushed commits outside the content folders. Review and push those commits manually first.');

    const checkBranch = async expected => {
      if ((await git(['symbolic-ref', '--quiet', '--short', 'HEAD'])).trim() !== branch ||
          (await git(['rev-parse', 'HEAD'])).trim() !== expected) fail('The Git branch changed during publishing. Stop concurrent Git operations and retry.');
    };
    await checkBranch(head);
    if (working) {
      operation = 'build'; progress({ state: 'building' });
      const temporary = await mkdtemp(path.join(os.tmpdir(), 'zibaldone-publish-output-'));
      try {
        const output = path.join(temporary, 'personal');
        try { await build({ source: root, output, basePath: '/personal/' }); }
        catch (error) { fail('Personal build failed: ' + error.message); }
        // A previous manual build is fine if it matches this build. Independently
        // edited generated files must never be silently overwritten or committed.
        const changed = new Set([...names(await git(['diff', '--name-only', '--no-renames', '-z', 'HEAD', '--', 'personal'])), ...names(await git(['ls-files', '--others', '--exclude-standard', '-z', '--', 'personal']))]);
        const bytes = file => readFile(file).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
        for (const name of changed) {
          const actual = await bytes(path.join(cwd, name)), generated = await bytes(path.join(temporary, name));
          if (actual === null ? generated !== null : !generated || !actual.equals(generated)) fail('Generated personal files have independent changes. Review them or rebuild with npm run build:personal before publishing.');
        }
        if ((await lstat(path.join(cwd, 'personal')).catch(() => null))?.isSymbolicLink()) fail('Personal output cannot be a symlink.');
        await checkIndex(); await checkBranch(head);
        await rm(path.join(cwd, 'personal'), { recursive: true, force: true });
        await cp(output, path.join(cwd, 'personal'), { recursive: true });
      } finally { await rm(temporary, { recursive: true, force: true }); }
    }
    if (working) {
      operation = 'commit'; progress({ state: 'committing' });
      await git(['var', 'GIT_AUTHOR_IDENT']); await git(['var', 'GIT_COMMITTER_IDENT']);
      await checkIndex();
      await git(['add', '--all', '--', ...folders]);
      await checkIndex(); await checkBranch(head);
      const staged = names(await git(['diff', '--cached', '--name-only', '--no-renames', '-z', '--', ...folders]));
      if (staged.length) {
        // --only keeps unrelated index changes made by another process out of
        // this commit, even if they appear after the preceding index check.
        await git(['commit', '--only', '-m', 'content.', '--', ...folders]);
        commit = (await git(['rev-parse', 'HEAD'])).trim();
        const paths = names(await git(['diff-tree', '--no-commit-id', '--name-only', '--no-renames', '-r', '-z', head, commit]));
        if (paths.some(name => !contentPath(name))) fail('A Git hook added unrelated files to the commit. Nothing was pushed; review the local commit and hook in a terminal.');
        head = commit;
      }
    }
    if (head === remoteHead) return { state: 'nothing', actionsURL };
    await checkBranch(head);
    operation = 'push'; progress({ state: 'pushing' });
    // Explicit hash/refspec and push URL avoid push.default, mirror, extra
    // push refspecs, and tag settings. A failed push leaves the commit retryable.
    await git(['push', '--porcelain', '--no-follow-tags', '--recurse-submodules=no', '--', remoteURL, `${head}:${ref}`]);
    return { state: 'success', commit: head.slice(0, 8), actionsURL };
  } catch (error) {
    const message = error.stderr !== undefined || error.code ? gitError(error, operation) : error.message;
    throw Object.assign(new Error(message + (commit ? ` Local commit ${commit.slice(0, 8)} was kept; retry after fixing the problem.` : '')), { actionsURL });
  } finally { await lock.close(); await unlink(lockPath); }
}
