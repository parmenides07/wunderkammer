import { readFile, lstat, realpath } from 'node:fs/promises';
import path from 'node:path';
import { zipSync } from 'fflate';
import { extension, fileKind, fileLimit, safeFilename, directFile, downloadPath, isPlainText, decodeText } from './client/files.js';
import { renderDocument } from './documents.mjs';

export function validateFile(bytes, filename) {
  if (!safeFilename(filename)) throw new Error('Use a filename without paths, control characters or reserved punctuation (maximum 240 characters).');
  if (bytes.length > fileLimit(filename)) throw new Error(`File exceeds the ${fileLimit(filename) / 1024 / 1024} MB limit.`);
  const ext = extension(filename), head = bytes.subarray(0, 16);
  const valid = {
    png: () => head.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])),
    jpg: () => head[0] === 255 && head[1] === 216 && head[2] === 255,
    jpeg: () => head[0] === 255 && head[1] === 216 && head[2] === 255,
    gif: () => ['GIF87a','GIF89a'].includes(head.toString('ascii', 0, 6)),
    webp: () => head.toString('ascii', 0, 4) === 'RIFF' && head.toString('ascii', 8, 12) === 'WEBP',
    mp4: () => head.toString('ascii', 4, 8) === 'ftyp',
    webm: () => head.subarray(0, 4).equals(Buffer.from([26,69,223,163])),
    pdf: () => head.toString('ascii', 0, 5) === '%PDF-',
    zip: () => ['504b0304','504b0506','504b0708'].includes(head.subarray(0,4).toString('hex')),
  };
  if (valid[ext] && !valid[ext]()) throw new Error(`File bytes do not match .${ext}.`);
  if (fileKind(filename) === 'document') {
    let text; try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { throw new Error('Documents must be UTF-8 text.'); }
    if (text.includes('\0')) throw new Error('Documents cannot contain binary data.');
  }
  return bytes;
}
export async function readAsset(root, name) {
  if (!/^[a-zA-Z0-9_.-]+$/.test(name) || name.startsWith('.')) throw new Error('Invalid asset path.');
  const directory = path.join(root, 'assets'), file = path.join(directory, name);
  if ((await lstat(directory)).isSymbolicLink() || await realpath(directory) !== path.join(await realpath(root), 'assets')) throw new Error('Asset directories must not be symlinks.');
  const stat = await lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink() || path.dirname(await realpath(file)) !== await realpath(directory)) throw new Error('Assets must be regular files, not symlinks.');
  return readFile(file);
}
export function packageFile(bytes, filename) {
  // Fixed ZIP timestamps make repeated builds byte-identical. Never unpack imports.
  return Buffer.from(zipSync({ [filename]: [bytes, { level: 0, mtime: new Date(1980, 0, 1) }] }));
}
export function fileReferences(pages) {
  const refs = new Map();
  for (const page of pages) for (const e of page.elements) if (e.type === 'file') {
    const href = downloadPath(e), previous = refs.get(e.filename);
    refs.set(e.filename, refs.has(e.filename) && previous !== href ? null : href);
  }
  return refs;
}
export async function prepareFile(root, e, references) {
  const name = e.src.split('/assets/')[1];
  if (extension(name) !== extension(e.filename)) throw new Error('Stored file extension must match the original filename.');
  const bytes = validateFile(await readAsset(root, name), e.filename);
  const kind = fileKind(e.filename, e.plainText);
  if (kind === 'text' && e.display === 'render') decodeText(bytes);
  return { bytes, download: directFile(e.filename) ? bytes : packageFile(bytes, e.filename),
    html: kind === 'document' || kind === 'text' && isPlainText(bytes) ? await renderDocument(bytes, e.filename, references) : null };
}
