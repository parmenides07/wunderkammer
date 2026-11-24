import { fileKind, downloadPath, downloadName, documentPath, directFile } from './files.js';
import { spaceURL, isMaximizable } from './model.js';
import { canvasURL } from './routes.js';
const documents = new Map();
const readingTouches = new WeakMap();

export function fileLink(element, base, label = element.label || element.filename) {
  const link = document.createElement('a');
  link.href = spaceURL(downloadPath(element), base);
  link.textContent = label + (directFile(element.filename) ? '' : ' (ZIP)');
  link.download = downloadName(element);
  link.rel = 'noopener noreferrer';
  return link;
}
function readInteraction(node, app, element) {
  if (!readingTouches.has(app)) {
    readingTouches.set(app, null);
    app.viewport.addEventListener('pointerdown', event => {
      const first = readingTouches.get(app);
      if (event.pointerType !== 'touch' || !first || first.id === event.pointerId) return;
      first.end();
      if (!first.node.isConnected) return;
      // The second finger may land outside this document (or on another one).
      // Transfer both pointers to the same canvas controller before bubbling.
      const pointer = (id, x, y) => ({ pointerId: id, pointerType: 'touch', button: 0,
        clientX: x, clientY: y, target: app.viewport, preventDefault() {} });
      app.camera.down(pointer(first.id, first.x, first.y));
      app.camera.down(pointer(event.pointerId, event.clientX, event.clientY));
      event.stopPropagation();
    }, true);
  }
  node.dataset.reading = 'true'; node.tabIndex = 0;
  let touch;
  node.addEventListener('pointerdown', event => {
    if (app.camera.space || event.button === 1) return;
    app.selectFile?.(element.id, event.shiftKey);
    if (app.editing && event.shiftKey) event.preventDefault();
    event.stopPropagation();
    if (event.pointerType === 'touch') {
      if (app.camera.pointers.size) {
        app.camera.down({ pointerId: event.pointerId, pointerType: 'touch', button: 0,
          clientX: event.clientX, clientY: event.clientY, target: app.viewport, preventDefault() {} });
        return;
      }
      touch = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false, node,
        horizontal: event.target.closest('pre') || node, end() { touch = null; readingTouches.set(app, null); } };
      readingTouches.set(app, touch);
      if (!event.target.closest('video')) node.setPointerCapture(event.pointerId);
    }
  });
  node.addEventListener('pointermove', event => {
    if (!touch || touch.id !== event.pointerId) return;
    const scale = node.closest('#focus-view') ? 1 : app.camera.value.zoom;
    const dx = (touch.x - event.clientX) / scale, dy = (touch.y - event.clientY) / scale;
    if (Math.hypot(dx, dy) > 2) touch.moved = true;
    touch.horizontal.scrollLeft += dx; node.scrollTop += dy;
    touch.x = event.clientX; touch.y = event.clientY;
  });
  let suppress = 0;
  node.addEventListener('pointerup', () => { if (touch?.moved) suppress = performance.now() + 350; touch?.end(); });
  node.addEventListener('pointercancel', () => { touch?.end(); });
  node.addEventListener('click', event => { if (performance.now() < suppress) { event.preventDefault(); event.stopPropagation(); } }, true);
}
async function loadDocument(content, element, app) {
  const url = spaceURL(documentPath(element.src), app.base);
  try {
    if (!documents.has(url)) documents.set(url, fetch(url, { cache: 'no-cache' }).then(async response => {
      if (!response.ok) throw new Error('Could not load the rendered document.');
      return response.text();
    }).catch(error => { documents.delete(url); throw error; }));
    const html = await documents.get(url);
    // Only our sanitized local/build output reaches this insertion point.
    content.innerHTML = html;
    const prefix = `document-${crypto.randomUUID()}-`;
    for (const node of content.querySelectorAll('[id]')) node.id = prefix + node.id;
    for (const link of content.querySelectorAll('a[href]')) {
      // A canvas document is one ordinary focusable object. Read and follow its
      // links in focus mode, without nested tab targets or conflicting clicks.
      if (content.classList.contains('document-preview')) { link.removeAttribute('href'); continue; }
      const href = link.getAttribute('href');
      if (href.startsWith('#')) {
        const target = href.slice(1); link.href = '#' + prefix + target;
        link.addEventListener('click', event => {
          event.preventDefault(); event.stopPropagation();
          const destination = [...content.querySelectorAll('[id]')].find(n => n.id === prefix + target);
          if (destination) {
            const scroller = content.closest('#focus-view') || content;
            const scale = scroller === content ? app.camera.value.zoom : 1;
            scroller.scrollTop += (destination.getBoundingClientRect().top - scroller.getBoundingClientRect().top) / scale;
          }
        });
      } else if (/^\/(space|personal|zibaldone)\//.test(href)) link.href = spaceURL(canvasURL(href, app.trail.ids, '/personal/', app.editing, location.origin), app.base);
      else { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
    }
    content.dataset.loaded = 'true'; app.invalidateBounds();
  } catch (error) { content.textContent = error.message; content.dataset.error = 'true'; }
}
export function fileContent(element, app, focus = false) {
  const kind = fileKind(element.filename, element.plainText), render = focus || element.display === 'render';
  if (!render || kind === 'attachment') {
    const link = fileLink(element, app.base, '↓ ' + (element.label || element.filename));
    link.className = 'content attachment';
    if (directFile(element.filename) && !link.href.endsWith('.zip') && !focus) { link.removeAttribute('download'); link.target = '_blank'; }
    link.addEventListener('click', event => { if (app.editing && !focus) event.preventDefault(); });
    return link;
  }
  const content = document.createElement('div'); content.className = 'content';
  if (kind === 'image') {
    const image = new Image(); image.src = spaceURL(element.src, app.base); image.alt = element.label || element.filename;
    image.draggable = false; image.style.objectFit = element.lockAspect === false && !focus ? 'fill' : 'contain'; content.append(image);
  } else if (kind === 'video') {
    const video = document.createElement('video'); video.src = spaceURL(element.src, app.base);
    video.controls = true; video.preload = 'metadata'; video.playsInline = true;
    video.setAttribute('aria-label', element.label || element.filename); content.append(video);
    if (!focus) readInteraction(content, app, element);
  } else {
    content.classList.add('document'); content.textContent = 'Loading…';
    content.setAttribute('role', 'region'); content.setAttribute('aria-label', element.label || element.filename);
    if (!focus) content.classList.add('document-preview');
    loadDocument(content, element, app);
  }
  if (!focus && ['image','document','text'].includes(kind) && isMaximizable(element)) {
    content.tabIndex = 0; content.setAttribute('role','button'); content.setAttribute('aria-haspopup','dialog');
    content.onclick = () => { if (!app.editing) app.focus(element, content); };
    content.onkeydown = event => { if (event.key === 'Enter' && !app.editing) { event.preventDefault(); app.focus(element, content); } };
  }
  return content;
}
export function makeFileObject(node, element, app) {
  const kind = fileKind(element.filename, element.plainText);
  if (element.display === 'render' && kind === 'image') node.classList.add('image-object');
  if (element.display === 'render' && kind === 'video') {
    const grip = document.createElement('span'); grip.className = 'file-grip'; grip.title = 'Drag to move this file'; node.append(grip);
    grip.addEventListener('pointerdown', () => {
      if (app.editing) {
        window.getSelection().removeAllRanges();
        document.activeElement?.closest('[data-reading]')?.blur();
      }
    });
  }
  const content = fileContent(element, app); node.append(content);
  if (isMaximizable(element) && !(element.display === 'render' && ['image','document','text'].includes(kind))) {
    const button = document.createElement('button'); button.className = 'focus-object'; button.textContent = '↗';
    button.setAttribute('aria-label', `View ${element.filename} in isolation`);
    button.onclick = () => app.focus(element, button); node.append(button);
  }
}
