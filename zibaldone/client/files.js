// Shared import policy. The original filename is metadata, never a disk path.
export const extension = name => name.toLowerCase().match(/\.([a-z0-9]{1,12})$/)?.[1] || 'bin';
export const TEXT_LIMIT = 2 * 1024 * 1024;
// Familiar source/text extensions also work for files imported before text detection.
const textExtensions = /^(txt|text|log|c|h|cc|cpp|cxx|hpp|s|asm|inc|py|js|mjs|cjs|ts|tsx|jsx|rs|go|java|sh|bash|zsh|fish|lua|lisp|el|clj|scm|rkt|rb|pl|php|swift|kt|sql|r|jl|f|f90|tex|bib|json|jsonl|csv|tsv|yaml|yml|toml|ini|conf|cfg|xml|html|htm|css|svg|rst|adoc|nix|make|mk|diff|patch)$/;
export const fileKind = (name, plainText) => /^(png|jpe?g|gif|webp)$/.test(extension(name)) ? 'image'
  : /^(mp4|webm)$/.test(extension(name)) ? 'video'
  : /^(md|markdown|org)$/.test(extension(name)) ? 'document'
  : plainText !== false && (plainText === true || textExtensions.test(extension(name)) || /^(makefile|dockerfile|readme|license)$/i.test(name)) ? 'text' : 'attachment';
export const renderable = (name, plainText) => fileKind(name, plainText) !== 'attachment';
export function decodeText(bytes) {
  if (bytes.byteLength > TEXT_LIMIT) throw new Error('Rendered text is limited to 2 MB. Use Attach for larger files.');
  // UTF-8 (including ASCII) and BOM-marked UTF-16. Never guess binary encodings.
  const encoding = bytes[0] === 255 && bytes[1] === 254 ? 'utf-16le' : bytes[0] === 254 && bytes[1] === 255 ? 'utf-16be' : 'utf-8';
  let value;
  try { value = new TextDecoder(encoding, { fatal: true }).decode(bytes); }
  catch { throw new Error('Render requires UTF-8 or BOM-marked UTF-16 text. Use Attach for binary files.'); }
  if (/[\x00-\x08\x0e-\x1f\x7f]/.test(value)) throw new Error('This file contains binary control characters. Use Attach instead.');
  return value;
}
export function isPlainText(bytes) {
  try { decodeText(bytes); return true; } catch { return false; }
}
export const fileLimit = name => (fileKind(name) === 'video' ? 75 : fileKind(name) === 'document' ? 2 : 25) * 1024 * 1024;
export const safeFilename = name => typeof name === 'string' && name.length > 0 && name.length <= 240 &&
  !/[\\/\x00-\x1f\x7f<>:"|?*]/.test(name) && name !== '.' && name !== '..' && !/[. ]$/.test(name);
export const importedPath = src => typeof src === 'string' && /^\/personal\/assets\/file-[a-f0-9-]{36}\.[a-z0-9]{1,12}$/.test(src);
export const directFile = name => ['image', 'video'].includes(fileKind(name)) || ['pdf', 'zip'].includes(extension(name));
export const downloadPath = e => e.src + (directFile(e.filename) ? '' : '.zip');
export const downloadName = e => e.filename + (directFile(e.filename) ? '' : '.zip');
export const documentPath = src => src.replace('/assets/', '/documents/') + '.html';
export const isMedia = e => e.type === 'image' || e.type === 'file' && e.display === 'render' && ['image', 'video'].includes(fileKind(e.filename));
