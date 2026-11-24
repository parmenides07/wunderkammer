import { fileKind, fileLimit, safeFilename, renderable, directFile, TEXT_LIMIT, isPlainText } from './files.js';
import { snap } from './model.js';

async function mediaSize(file) {
  const kind = fileKind(file.name);
  if (!['image', 'video'].includes(kind)) return null;
  const url = URL.createObjectURL(file), media = kind === 'image' ? new Image() : document.createElement('video');
  try {
    if (kind === 'image') { media.src = url; await media.decode(); return [media.naturalWidth, media.naturalHeight]; }
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Could not read video metadata. Try Attach for this file.')), 15000);
      media.onloadedmetadata = () => { clearTimeout(timer); resolve(); };
      media.onerror = () => { clearTimeout(timer); reject(new Error('This browser cannot read the video. Try Attach.')); };
      media.preload = 'metadata'; media.src = url;
    });
    return [media.videoWidth || 16, media.videoHeight || 9];
  } finally { if (kind === 'video') { media.removeAttribute('src'); media.load(); } URL.revokeObjectURL(url); }
}
export function fileImporter({ app, api, track, commit, selected, snapped, canImport }) {
  const menu = document.createElement('div'); menu.id = 'file-import-menu'; menu.className = 'editor-tools'; menu.hidden = true;
  menu.setAttribute('role', 'dialog'); menu.setAttribute('aria-label', 'Import file');
  menu.innerHTML = '<span id="import-name"></span><div class="tool-row"><button id="import-render">Render</button><button id="import-attach">Attach</button><button id="import-cancel">Cancel</button></div><span id="import-error" role="alert"></span>';
  document.body.append(menu);
  const input = document.createElement('input'); input.type = 'file'; input.multiple = true; input.hidden = true; input.id = 'file-input'; document.body.append(input);
  const replacement = document.createElement('input'); replacement.type = 'file'; replacement.hidden = true; replacement.id = 'replace-file-input'; document.body.append(replacement);
  let pending = [], replaceId, queue = Promise.resolve();
  const enqueue = operation => {
    const task = queue.then(operation); queue = task.catch(() => {});
    track(() => task);
  };
  const close = () => { pending = []; menu.hidden = true; };
  const showNext = () => {
    if (!pending.length) { close(); return; }
    const item = pending[0], valid = safeFilename(item.file.name) && item.file.size <= fileLimit(item.file.name);
    menu.querySelector('#import-name').textContent = item.file.name + (pending.length > 1 ? ` · ${pending.length} files` : '');
    const inspect = !directFile(item.file.name) && fileKind(item.file.name) !== 'document';
    const render = menu.querySelector('#import-render'); render.hidden = inspect ? item.plainText !== true : !renderable(item.file.name); render.disabled = !valid;
    menu.querySelector('#import-attach').disabled = !valid;
    menu.querySelector('#import-error').textContent = valid ? '' : `Invalid filename or file exceeds ${fileLimit(item.file.name) / 1024 / 1024} MB.`;
    menu.hidden = false;
    menu.style.left = Math.max(8, Math.min(innerWidth - menu.offsetWidth - 8, item.screen.x)) + 'px';
    menu.style.top = Math.max(32, Math.min(innerHeight - menu.offsetHeight - 8, item.screen.y)) + 'px';
    (render.hidden ? menu.querySelector('#import-attach') : render).focus({ preventScroll: true });
    if (inspect && item.plainText === undefined) {
      item.plainText = false;
      if (valid && item.file.size <= TEXT_LIMIT) item.file.arrayBuffer().then(bytes => {
        item.plainText = isPlainText(new Uint8Array(bytes));
        if (pending[0] === item) showNext();
      }).catch(() => { /* Attach remains available if local text inspection fails. */ });
    }
  };
  const choose = files => (point, screen, snapEnabled) => {
    pending = [...files].map((file, i) => ({ file, x: snap(point.x + i, snapEnabled), y: snap(point.y + i, snapEnabled), screen }));
    showNext();
  };
  async function upload(file, display) {
    const size = display === 'render' ? await mediaSize(file) : null;
    const saved = await api('/_zibaldone/api/files', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream', 'X-Zibaldone-Filename': encodeURIComponent(file.name) }, body: file });
    if (display === 'render' && !renderable(saved.filename, saved.plainText)) throw new Error('This file cannot be rendered as text. Choose Attach.');
    return { saved, size };
  }
  for (const display of ['render', 'attach']) menu.querySelector('#import-' + display).onclick = () => {
    const item = pending.shift(); showNext();
    enqueue(async () => {
      const { saved, size } = await upload(item.file, display);
      const e = { id: crypto.randomUUID(), type: 'file', ...saved, display, x: item.x, y: item.y,
        width: size ? 12 : display === 'render' ? 24 : 12,
        height: size ? 12 * size[1] / size[0] : display === 'render' ? 18 : 2,
        font: 'xanh', fontSize: 18 };
      commit(e);
    });
  };
  menu.querySelector('#import-cancel').onclick = close;
  menu.addEventListener('keydown', event => { event.stopPropagation(); if (event.key === 'Escape') close(); });
  input.onchange = () => { if (canImport()) choose(input.files)({ ...app.camera.value }, { x: innerWidth / 2, y: innerHeight / 2 }, snapped()); input.value = ''; };
  replacement.onchange = () => {
    const file = replacement.files[0], id = replaceId; replacement.value = '';
    if (!file || !canImport()) return;
    enqueue(async () => {
      const e = app.page.elements.find(e => e.id === id);
      if (!e) throw new Error('Select the file again before replacing its source.');
      if (['image','video'].includes(fileKind(file.name)) && e.display === 'render') await mediaSize(file);
      const { saved } = await upload(file, 'attach');
      const display = renderable(saved.filename, saved.plainText) ? e.display : 'attach';
      commit({ ...e, ...saved, display }, id);
    });
  };
  app.viewport.addEventListener('dragover', event => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; });
  app.viewport.addEventListener('drop', event => {
    event.preventDefault();
    if (canImport() && event.dataTransfer.files.length) choose(event.dataTransfer.files)(app.camera.toWorld(app.camera.point(event)), { x: event.clientX, y: event.clientY }, snapped(event));
  });
  for (const type of ['dragover', 'drop']) window.addEventListener(type, event => {
    if ([...event.dataTransfer?.types || []].includes('Files')) event.preventDefault();
  });
  return { close, open() { if (canImport()) input.click(); }, replace() { replaceId = selected()?.id; if (replaceId) replacement.click(); } };
}
