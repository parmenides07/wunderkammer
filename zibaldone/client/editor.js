import { canvasURL, routeURL } from './routes.js';
import { ready } from './main.js';
import { isTyping } from './camera.js';
import { GRID, pageURL, snap, resizeBox, validatePage, validHref, elementBounds, isMaximizable, spaceURL, linePoints, setLinePoints, translateElement, routeSegment, nearestSegment, intersectsRect } from './model.js';

import { History } from './history.js';
import { Autosave } from './autosave.js';
import { encodeClipboard, decodeClipboard, cloneElements } from './clipboard.js';

const app = await ready;
const token = document.querySelector('meta[name=zibaldone-editor-token]')?.content;
if (app && token) startEditor(app, token);

function startEditor(app, token) {
  app.editing = true;
  document.body.classList.add('editing');
  document.body.insertAdjacentHTML('beforeend', `
    <details id="editor-tools" class="editor-tools" open>
      <summary>Edit · <span id="page-name"></span></summary>
      <div class="tool-row">
        <select id="page-picker" aria-label="Open canvas"></select>
        <button id="new-page">New page</button>
        <button id="add-text">Text</button>
        <button id="add-image">Image</button>
        <button id="add-line">Line</button>
        <button id="set-camera">Set starting view</button>
        <button id="publish-page">Publish</button>
        <button id="undo" disabled>Undo</button><button id="redo" disabled>Redo</button>
        <a id="preview" target="_blank" rel="noopener">Preview ↗</a>
      </div>
      <div class="tool-row">
        <label><input id="snap-grid" type="checkbox" checked> Snap</label>
        <label><input id="show-grid" type="checkbox"> Dots</label>
        <label title="Override automatic wheel detection for your pointing device">Input
          <select id="wheel-input" aria-label="Wheel input mode"><option value="auto">Auto</option><option value="mouse">Mouse</option><option value="trackpad">Trackpad</option></select>
        </label>
        <label id="line-mode-setting" hidden>Line <select id="line-mode"><option value="orthogonal">Orthogonal</option><option value="direct">Direct</option></select></label>
        <span id="camera-readout"></span>
        <button id="save-page" title="Retry or flush autosave">Save now</button>
      </div>
      <small>Double-click blank space: text · double-click text: edit · Space + drag: pan</small>
      <span id="save-status" role="status" aria-live="polite">Saved</span>
      <span id="save-error" role="alert" hidden></span>
      <a id="deployment-link" target="_blank" rel="noopener" hidden>Check deployment ↗</a>
      <button id="download-draft" hidden>Download unsaved JSON</button>
    </details>
    <details id="properties" class="editor-tools" hidden open>
      <summary id="object-label">Object</summary>
      <div id="single-properties">
      <div id="box-properties" class="tool-row">
        <label>X <input id="prop-x" type="number" step="any"></label>
        <label>Y <input id="prop-y" type="number" step="any"></label>
        <label>W <input id="prop-width" type="number" step="any" min="0.1"></label>
        <label>H <input id="prop-height" type="number" step="any" min="0.1"></label>
        <span>grid units</span>
      </div>
      <div id="line-properties" hidden>
        <div class="tool-row">
          <label>X1 <input id="prop-x1" type="number" step="any"></label>
          <label>Y1 <input id="prop-y1" type="number" step="any"></label>
          <label>X2 <input id="prop-x2" type="number" step="any"></label>
          <label>Y2 <input id="prop-y2" type="number" step="any"></label>
          <span>grid units</span>
        </div>
        <div class="tool-row">
          <select id="prop-strokeStyle" aria-label="Stroke style"><option value="solid">Solid</option><option value="dashed">Dashed</option><option value="dotted">Dotted</option></select>
          <label>Stroke <input id="prop-strokeWidth" type="number" min="0.1" max="100" step="0.1"> px</label>
          <label><input id="prop-arrowhead" type="checkbox"> End arrow</label>
        </div>
      </div>
      <div class="tool-row">
        <label>Z <input id="prop-zIndex" type="number" step="1" min="-2147483647" max="2147483647"></label>
        <button id="bring-forward">Bring forward</button>
        <button id="send-backward">Send backward</button>
        <label id="shadow-property"><input id="prop-shadow" type="checkbox"> Shadow</label>
        <label id="maximize-property"><input id="prop-maximizable" type="checkbox"> Maximizable</label>
      </div>
      <div id="text-properties" class="tool-row">
        <select id="prop-font" aria-label="Font"><option value="mono">JetBrains Mono</option><option value="baskerville">Baskerville</option></select>
        <label>Size <input id="prop-fontSize" type="number" min="1" max="1000" step="1"> px</label>
        <label>Line height <input id="prop-lineHeight" type="number" min="0.5" max="4" step="0.05"></label>
        <label>Spacing <input id="prop-letterSpacing" type="number" min="-0.1" max="1" step="0.01"> em</label>
        <select id="prop-align" aria-label="Text alignment"><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select>
        <button id="edit-text">Edit text</button>
        <label><input id="prop-invertOnHover" type="checkbox"> Invert on hover</label>
      </div>
      <div id="image-properties" class="tool-row">
        <label><input id="prop-lockAspect" type="checkbox" checked> Keep aspect ratio</label>
        <label>Alt <input id="prop-alt" type="text"></label>
      </div>
      <div class="tool-row">
        <label id="link-property">Link <input id="prop-href" type="text" placeholder="/personal/#/field-notes or https://…" list="canvas-links"></label>
        <datalist id="canvas-links"></datalist>
        <a id="follow-link" hidden>Follow ↗</a>
        <button id="focus-selected">Focus</button>
      </div>
      </div>
      <div class="tool-row">
        <label><input id="prop-locked" type="checkbox"> Locked</label>
        <button id="delete-object">Delete</button>
      </div>
    </details>
    <input id="image-input" type="file" accept="image/png,image/jpeg,image/gif,image/webp" multiple hidden>
    <dialog id="new-page-dialog" aria-labelledby="new-page-label">
      <form id="new-page-form">
        <label id="new-page-label" for="new-slug">New canvas slug</label>
        <input id="new-slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxlength="80" placeholder="another-space" autocomplete="off">
        <p id="new-page-error" role="alert"></p>
        <div><button type="submit">Create</button> <button type="button" id="cancel-new">Cancel</button></div>
      </form>
    </dialog>`);

  const $ = id => document.getElementById(id);
  let history = new History(app.page);
  let navigating = false;
  let selection = new Set();
  let selected = null;
  let drawing = null;
  let editing = null;
  let dirty = false;
  let autosave, leaveTask, uploadError = null;
  let publishing = false;
  const pendingImages = new Set();
  let uploads = 0;
  const snapped = event => $('snap-grid').checked && !event?.altKey;
  const status = text => { $('save-status').textContent = text; };
  const syncDirty = () => {
    dirty = history.isDirty(app.page);
    $('undo').disabled = history.index === 0;
    $('redo').disabled = history.index === history.states.length - 1;
    rememberDraft();
  };
  const changed = (immediate = false) => { history.commit(app.page); syncDirty(); autosave?.changed(immediate); };
  const selectedElements = () => app.page.elements.filter(e => selection.has(e.id));
  const element = () => app.page.elements.find(e => e.id === selected);
  const checkOverflow = () => {
    for (const e of app.page.elements) if (e.type === 'text') {
      const node = app.nodes.get(e.id);
      node.dataset.overflow = node.querySelector('.content').scrollHeight > node.clientHeight + 1;
    }
  };
  const update = e => { app.update(e); positionLineHandles(e); requestAnimationFrame(checkOverflow); };
  async function prepareLeave() {
    if (publishing || navigating) return false;
    if (leaveTask) return leaveTask;
    endText();
    if (drawing?.points.length && !confirm('Discard the unfinished line and leave this canvas?')) return false;
    cancelLine(); app.camera.gesture?.cancel?.(); app.camera.gesture = null;
    const controls = [app.viewport, $('properties'), ...$('editor-tools').querySelectorAll('.tool-row')];
    controls.forEach(node => { node.inert = true; });
    leaveTask = save().finally(() => {
      controls.forEach(node => { node.inert = false; }); leaveTask = null;
    });
    return leaveTask;
  }
  app.trail.setGuard(prepareLeave);
  app.routePending = value => {
    navigating = value;
    for (const node of [app.viewport, $('properties'), ...$('editor-tools').querySelectorAll('.tool-row')]) node.inert = value;
  };
  app.beforePageChange = () => {
    endText(); cancelLine(); app.camera.gesture?.cancel?.(); app.camera.gesture = null;
    autosave.close();
    selection.clear(); selected = null; dirty = false; $('properties').hidden = true;
  };
  app.afterPageChange = () => {
    history = new History(app.page); dirty = false;
    $('editor-tools').hidden = false; $('page-name').textContent = app.page.slug;
    $('page-picker').value = app.page.slug; $('preview').href = routeURL(app.trail.ids, app.base);
    $('download-draft').hidden = true; $('deployment-link').hidden = true;
    startAutosave(); recoverDraft();
    decorateSelection(); syncDirty(); requestAnimationFrame(checkOverflow);
  };
  const api = async (url, options = {}) => {
    const response = await fetch(url, { ...options, headers: { 'X-Zibaldone-Token': token, ...options.headers } });
    const data = await response.json();
    if (!response.ok) throw Object.assign(new Error(data.error || `Request failed (${response.status}).`), { status: response.status });
    return data;
  };
  const report = error => { status(error.message); if (dirty) $('download-draft').hidden = false; };

  $('page-name').textContent = app.page.slug;
  $('preview').href = routeURL(app.trail.ids, app.base);
  function showCamera(c) { $('camera-readout').textContent = `${Math.round(c.zoom * 100)}% · ${c.x.toFixed(1)}, ${c.y.toFixed(1)}`; }
  app.camera.onChange = c => { showCamera(c); previewLine(); };
  showCamera(app.camera.value);
  $('wheel-input').value = app.camera.wheelMode;
  $('wheel-input').onchange = () => app.camera.setWheelMode($('wheel-input').value);
  document.fonts.ready.then(checkOverflow);

  async function listPages() {
    const slugs = await api('/_zibaldone/api/pages');
    $('page-picker').replaceChildren(); $('canvas-links').replaceChildren();
    for (const slug of slugs) {
      const option = new Option(slug, slug, false, slug === app.page.slug);
      $('page-picker').add(option);
      $('canvas-links').append(new Option(slug, pageURL(slug)));
    }
  }
  listPages().catch(report);

  function endText() {
    if (!editing) return;
    const id = editing;
    editing = null; // Blur must not end the same editing session twice.
    const content = app.nodes.get(id)?.querySelector('.content');
    if (content) {
      content.removeAttribute('contenteditable');
      content.removeAttribute('aria-multiline');
      content.removeAttribute('aria-label');
      if (content.tagName !== 'A' && isMaximizable(app.page.elements.find(e => e.id === id))) content.setAttribute('role', 'button');
      else content.removeAttribute('role');
      content.blur();
    }
    changed(true);
  }
  function refreshProperties() {
    const objects = selectedElements(), e = element();
    $('properties').hidden = !objects.length;
    if (!objects.length) return;
    $('object-label').textContent = objects.length > 1 ? `${objects.length} objects` : `${e.type} · ${e.id}`;
    $('prop-locked').checked = objects.every(e => e.locked);
    $('prop-locked').indeterminate = objects.some(e => e.locked) && !objects.every(e => e.locked);
    $('single-properties').hidden = objects.length !== 1;
    if (objects.length !== 1) return;
    const defaults = { align: 'left', zIndex: 0, strokeStyle: 'solid', strokeWidth: 1, lineHeight: 1.4, letterSpacing: 0 };
    const points = e.type === 'line' ? linePoints(e) : null;
    const endpoints = points ? { x1: points[0][0], y1: points[0][1], x2: points.at(-1)[0], y2: points.at(-1)[1] } : {};
    for (const key of ['x', 'y', 'width', 'height', 'x1', 'y1', 'x2', 'y2', 'fontSize', 'font', 'align', 'alt', 'href', 'zIndex', 'strokeStyle', 'strokeWidth', 'lineHeight', 'letterSpacing']) {
      const value = endpoints[key] ?? e[key] ?? defaults[key] ?? '';
      $('prop-' + key).value = typeof value === 'number' ? Number(value.toFixed(4)) : value;
      if (['x', 'y', 'width', 'height', 'x1', 'y1', 'x2', 'y2'].includes(key)) $('prop-' + key).disabled = e.locked === true;
    }
    $('box-properties').hidden = e.type === 'line';
    $('line-properties').hidden = e.type !== 'line';
    $('maximize-property').hidden = e.type === 'line';
    $('shadow-property').hidden = e.type === 'line';
    $('link-property').hidden = e.type === 'line';
    $('prop-maximizable').checked = isMaximizable(e);
    $('prop-shadow').checked = e.shadow === true;
    $('prop-invertOnHover').checked = e.invertOnHover === true;
    $('prop-arrowhead').checked = e.arrowhead === true;
    $('focus-selected').hidden = !isMaximizable(e);
    $('text-properties').hidden = e.type !== 'text';
    $('image-properties').hidden = e.type !== 'image';
    $('prop-lockAspect').checked = e.lockAspect !== false;
    $('follow-link').hidden = !e.href;
    if (e.href) $('follow-link').href = canvasURL(e.href, app.trail.ids, app.base, true, location.origin);
  }
  function select(id) { setSelection(id ? [id] : []); }
  function setSelection(ids, primary = null) {
    if (editing && (!ids.includes(editing) || ids.length !== 1)) endText();
    selection = new Set(ids.filter(id => app.nodes.has(id)));
    selected = selection.has(primary) ? primary : [...selection].at(-1) ?? null;
    decorateSelection();
  }
  function decorateSelection() {
    for (const [id, node] of app.nodes) {
      node.classList.toggle('selected', selection.has(id));
      node.classList.toggle('locked', app.page.elements.find(e => e.id === id)?.locked === true);
      node.querySelectorAll('.resize-handle').forEach(h => h.remove());
    }
    const e = element();
    if (e && selection.size === 1 && !e.locked) {
      const node = app.nodes.get(e.id);
      const axes = e.type === 'line' ? linePoints(e).map((_, i) => i === 0 ? 'start' : i === linePoints(e).length - 1 ? 'end' : `vertex-${i}`) : e.type === 'text' ? ['width', 'height', 'both'] : ['both'];
      axes.forEach((axis, index) => {
        const handle = document.createElement('button');
        handle.className = 'resize-handle';
        handle.dataset.handle = axis;
        if (e.type === 'line') handle.dataset.vertex = index;
        handle.setAttribute('aria-label', e.type === 'line' ? `Move vertex ${index + 1}` : `Resize ${axis === 'both' ? 'object' : axis}; also available in properties`);
        handle.tabIndex = -1;
        node.append(handle);
      });
      positionLineHandles(e);
    }
    refreshProperties();
  }
  function positionLineHandles(e) {
    if (e.type !== 'line') return;
    const box = elementBounds(e), points = linePoints(e);
    for (const handle of app.nodes.get(e.id).querySelectorAll('.resize-handle')) {
      const point = points[Number(handle.dataset.vertex)];
      handle.style.left = `${(point[0] - box.x) * GRID}px`;
      handle.style.top = `${(point[1] - box.y) * GRID}px`;
    }
  }
  function redraw() { endText(); app.render(); setSelection([...selection], selected); requestAnimationFrame(checkOverflow); }
  function editText() {
    const e = element();
    if (!e || e.type !== 'text') return;
    endText();
    select(e.id);
    editing = e.id;
    const content = app.nodes.get(e.id).querySelector('.content');
    // Plaintext-only keeps paste and undo inside the browser's native editor.
    content.contentEditable = 'plaintext-only';
    content.setAttribute('role', 'textbox');
    content.setAttribute('aria-multiline', 'true');
    content.setAttribute('aria-label', 'Edit text');
    content.focus({ preventScroll: true });
    const range = document.createRange();
    range.selectNodeContents(content);
    range.collapse(false);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    content.oninput = () => { e.text = content.innerText; syncDirty(); autosave.changed(); checkOverflow(); };
    content.onblur = endText;
  }
  function addText(point) {
    const e = { id: crypto.randomUUID(), type: 'text', x: snap(point.x, snapped()), y: snap(point.y, snapped()), width: 12, height: 5, text: '', font: 'mono', fontSize: 16 };
    app.page.elements.push(e);
    app.world.append(app.makeObject(e));
    select(e.id);
    changed();
    editText();
  }

  function restoreElement(e, before) {
    for (const key of Object.keys(e)) delete e[key];
    Object.assign(e, structuredClone(before));
  }
  app.camera.onTouchStart = () => {
    const previous = [...selection], primary = selected;
    return () => setSelection(previous, primary);
  };
  app.camera.onObjectDown = (event, point) => {
    if (!app.world.contains(document.activeElement)) document.activeElement?.blur();
    if (drawing) return { move() {}, end(moved, up) { if (!moved) placeLinePoint(app.camera.point(up), up); } };
    const node = event.target.closest('.object');
    const origin = app.camera.toWorld(point);
    if (!node) {
      endText();
      if (event.pointerType === 'touch') { select(null); return null; }
      const previous = [...selection], base = event.shiftKey ? previous : [];
      setSelection(base);
      const marquee = document.createElement('div');
      marquee.className = 'selection-marquee';
      app.world.append(marquee);
      return {
        move(point) {
          const end = app.camera.toWorld(point);
          const rect = { x: Math.min(origin.x, end.x), y: Math.min(origin.y, end.y), width: Math.abs(end.x - origin.x), height: Math.abs(end.y - origin.y) };
          Object.assign(marquee.style, { left: `${rect.x * GRID}px`, top: `${rect.y * GRID}px`, width: `${rect.width * GRID}px`, height: `${rect.height * GRID}px` });
          setSelection([...new Set([...base, ...app.page.elements.filter(e => intersectsRect(e, rect)).map(e => e.id)])]);
        },
        end() { marquee.remove(); },
        cancel() { marquee.remove(); setSelection(previous); },
      };
    }
    const id = node.dataset.id;
    const handleNode = event.target.closest('.resize-handle');
    const handle = handleNode?.dataset.handle, vertex = Number(handleNode?.dataset.vertex);
    const wasSelected = selection.has(id);
    endText();
    // Keep the captured handle in the DOM until pointerup.
    if (event.shiftKey && !handle) {
      setSelection(wasSelected ? [...selection].filter(value => value !== id) : [...selection, id], id);
      return { move() {} };
    }
    if (!wasSelected) select(id);
    else { selected = id; refreshProperties(); }
    if (event.pointerType === 'touch' && !wasSelected && !handle) return null;
    event.preventDefault();
    const e = element();
    if (e.locked) return { move() {} };
    const start = structuredClone(e);
    const movable = selectedElements().filter(e => !e.locked).map(e => [e, structuredClone(e)]);
    autosave.pause();
    const anchor = e.type === 'line' ? linePoints(start)[0] : [start.x, start.y];
    return {
      move(point, event) {
        const world = app.camera.toWorld(point);
        const dx = world.x - origin.x, dy = world.y - origin.y;
        if (handle && e.type === 'line') {
          const points = linePoints(start).map(p => [...p]);
          points[vertex] = [snap(points[vertex][0] + dx, snapped(event)), snap(points[vertex][1] + dy, snapped(event))];
          setLinePoints(e, points);
          update(e);
        } else if (handle) {
          Object.assign(e, resizeBox(start, handle === 'height' ? 0 : dx, handle === 'width' ? 0 : dy, snapped(event), e.type === 'image' && e.lockAspect !== false));
          if (handle === 'width') e.height = start.height;
          if (handle === 'height') e.width = start.width;
          update(e);
        } else {
          const mx = snap(anchor[0] + dx, snapped(event)) - anchor[0];
          const my = snap(anchor[1] + dy, snapped(event)) - anchor[1];
          for (const [object, before] of movable) {
            restoreElement(object, before);
            translateElement(object, mx, my);
            update(object);
          }
        }
        refreshProperties();
      },
      end(moved) { autosave.resume(); if (moved) changed(true); else if (!handle) select(id); },
      cancel() { autosave.resume(); for (const [object, before] of movable) { restoreElement(object, before); update(object); } refreshProperties(); },
    };
  };

  function previewLine(event) {
    if (!drawing?.points.length || !drawing.pointer) return;
    const target = app.camera.toWorld(drawing.pointer);
    const end = [snap(target.x, snapped(event)), snap(target.y, snapped(event))];
    drawing.preview = [...drawing.points, ...routeSegment(drawing.points.at(-1), end, $('line-mode').value, drawing.horizontalFirst).slice(1)];
    const draft = { id: drawing.id, type: 'line', points: drawing.preview };
    if (!app.nodes.has(draft.id)) {
      const node = app.makeObject(draft);
      node.classList.add('line-draft');
      app.world.append(node);
    } else app.update(draft);
  }
  function placeLinePoint(point, event) {
    if (!drawing) return;
    drawing.pointer = point;
    const target = app.camera.toWorld(point);
    const end = [snap(target.x, snapped(event)), snap(target.y, snapped(event))];
    const next = drawing.points.length ? routeSegment(drawing.points.at(-1), end, $('line-mode').value, drawing.horizontalFirst).slice(1) : [end];
    if (next.length) { drawing.steps.push(drawing.points.length); drawing.points.push(...next); }
    previewLine(event);
  }
  function cancelLine() {
    if (!drawing) return;
    app.nodes.get(drawing.id)?.remove(); app.nodes.delete(drawing.id);
    drawing = null;
    $('line-mode-setting').hidden = true;
    app.viewport.classList.remove('drawing-line');
    syncDirty();
  }
  function finishLine(includePreview = false) {
    if (!drawing) return;
    const points = includePreview ? drawing.preview || drawing.points : drawing.points;
    if (points.length < 2) { status('Place at least two points, or Escape to cancel.'); return; }
    const e = { id: drawing.id, type: 'line', points: points.map(p => [...p]) };
    try { validatePage({ ...app.page, elements: [...app.page.elements, e] }); } catch (error) { report(error); return; }
    cancelLine();
    app.page.elements.push(e); app.world.append(app.makeObject(e)); select(e.id); changed();
  }
  app.viewport.addEventListener('pointermove', event => {
    if (drawing) { drawing.pointer = app.camera.point(event); previewLine(event); }
  });
  app.viewport.addEventListener('dblclick', event => {
    if (app.camera.space || isTyping(event.target) || event.target.closest('button')) return;
    if (drawing) { event.preventDefault(); finishLine(); return; }
    const node = event.target.closest('.object');
    if (node) {
      select(node.dataset.id);
      const e = element();
      if (e.type === 'line' && !e.locked) {
        const points = linePoints(e).map(p => [...p]);
        const world = app.camera.toWorld(app.camera.point(event));
        const at = nearestSegment(points, [world.x, world.y]);
        const point = at.point.map(v => snap(v, snapped(event)));
        if (!points.some(p => p[0] === point[0] && p[1] === point[1])) {
          points.splice(at.index + 1, 0, point); setLinePoints(e, points); update(e); select(e.id); changed();
        }
      } else editText();
    } else addText(app.camera.toWorld(app.camera.point(event)));
  });
  $('add-text').onclick = () => { cancelLine(); addText(app.camera.value); };
  $('add-line').onclick = () => {
    endText(); cancelLine(); select(null);
    drawing = { id: crypto.randomUUID(), points: [], steps: [], horizontalFirst: true };
    $('line-mode-setting').hidden = false;
    app.viewport.classList.add('drawing-line');
    status('Click points · Enter / double-click: finish · Tab: elbow · Backspace: last point · Escape: cancel');
  };
  $('line-mode').onchange = () => previewLine();
  $('edit-text').onclick = editText;
  $('show-grid').onchange = () => app.viewport.classList.toggle('show-grid', $('show-grid').checked);
  $('set-camera').onclick = () => { app.page.camera = { ...app.camera.value }; changed(true); };
  $('focus-selected').onclick = () => { endText(); if (element()) app.focus(element(), $('focus-selected')); };
  $('delete-object').onclick = removeSelected;
  function removeSelected() {
    if (!selection.size) return;
    endText();
    app.page.elements = app.page.elements.filter(e => !selection.has(e.id));
    for (const id of selection) { app.nodes.get(id)?.remove(); app.nodes.delete(id); }
    select(null); changed();
  }
  $('prop-locked').onchange = () => {
    endText();
    for (const e of selectedElements()) e.locked = $('prop-locked').checked;
    decorateSelection(); changed();
  };
  for (const [id, delta] of [['bring-forward', 1], ['send-backward', -1]]) $(id).onclick = () => {
    const e = element();
    if (!e) return;
    $('prop-zIndex').value = (e.zIndex ?? 0) + delta;
    $('prop-zIndex').dispatchEvent(new Event('change'));
  };
  for (const key of ['x', 'y', 'width', 'height', 'x1', 'y1', 'x2', 'y2', 'fontSize', 'font', 'align', 'alt', 'href', 'lockAspect', 'zIndex', 'maximizable', 'invertOnHover', 'strokeStyle', 'strokeWidth', 'arrowhead', 'shadow', 'lineHeight', 'letterSpacing']) {
    $('prop-' + key).addEventListener('change', event => {
      const e = element();
      if (!e) return;
      endText();
      const before = structuredClone(e);
      const input = event.target;
      try {
        if (e.locked && ['x', 'y', 'width', 'height', 'x1', 'y1', 'x2', 'y2'].includes(key)) return;
        if (key === 'href') {
          const value = input.value.trim();
          if (value && !validHref(value)) throw new Error('Use /zibaldone/slug/, https://…, mailto:…, or tel:… . Clear the field to remove a link.');
          if (value) e.href = value; else delete e.href;
        } else if (input.type === 'checkbox') e[key] = input.checked;
        else if (input.type === 'number') {
          if (input.value === '') throw new Error('Enter a number.');
          const value = Number(input.value);
          if (e.type === 'line' && ['x1', 'y1', 'x2', 'y2'].includes(key)) {
            const points = linePoints(e).map(p => [...p]);
            points[key[1] === '1' ? 0 : points.length - 1][key[0] === 'x' ? 0 : 1] = snap(value, snapped(event));
            setLinePoints(e, points);
          } else if (['width', 'height'].includes(key) && e.type === 'image' && e.lockAspect !== false) {
            const ratio = e.width / e.height;
            e[key] = snap(value, snapped());
            if (key === 'width') e.height = e.width / ratio; else e.width = e.height * ratio;
          } else e[key] = ['x', 'y', 'width', 'height', 'x1', 'y1', 'x2', 'y2'].includes(key) ? snap(value, snapped()) : value;
        } else e[key] = input.value;
        validatePage(app.page);
        if (['href', 'alt', 'lockAspect', 'maximizable', 'invertOnHover'].includes(key)) redraw(); else update(e);
        changed();
      } catch (error) { Object.keys(e).forEach(k => delete e[k]); Object.assign(e, before); report(error); }
      refreshProperties();
    });
  }

  function draftKey() { return `zibaldone-draft:${app.base}:${app.page.slug}`; }
  function rememberDraft() {
    try {
      if (history.isDirty(app.page)) sessionStorage.setItem(draftKey(), JSON.stringify({ page: app.page, revision: app.revision }));
      else sessionStorage.removeItem(draftKey());
    } catch { /* Disk saves and the download fallback still work without storage. */ }
  }
  function startAutosave() {
    uploadError = null;
    $('save-error').hidden = true;
    autosave = new Autosave({
      snapshot: () => JSON.stringify(app.page), saved: history.saved,
      ready: async () => {
        while (pendingImages.size) await Promise.all([...pendingImages]);
        if (uploadError) throw uploadError;
      },
      write: async snapshot => {
        validatePage(JSON.parse(snapshot));
        const result = await api(`/_zibaldone/api/pages/${app.page.slug}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json', 'If-Match': app.revision }, body: snapshot,
        });
        app.revision = result.revision;
      },
      persisted: snapshot => { history.markSaved(snapshot); syncDirty(); },
      state: (value, error) => {
        if (!publishing) status(value);
        $('save-error').hidden = !error;
        $('save-error').textContent = error ? `${error.message} Changes remain in this tab. Use Download unsaved JSON before resolving a conflict or reloading.` : '';
        $('download-draft').hidden = !error;
        if (error) rememberDraft();
      },
    });
    status('Saved');
  }
  function recoverDraft() {
    try {
      const draft = JSON.parse(sessionStorage.getItem(draftKey()));
      if (!draft) return;
      validatePage(draft.page, app.page.slug);
      if (JSON.stringify(draft.page) === JSON.stringify(app.page)) { sessionStorage.removeItem(draftKey()); return; }
      if (!confirm('Recover unsaved changes from the previous editing session? Cancel keeps the version on disk.')) {
        sessionStorage.removeItem(draftKey()); return;
      }
      app.page = draft.page;
      // Use the draft's original revision; recovery must not overwrite a newer disk version.
      app.revision = draft.revision;
      history.commit(app.page); app.render(); syncDirty(); autosave.changed();
    } catch (error) { report(error); }
  }
  async function save() {
    if (navigating || app.invalid) return false;
    try { await autosave.flush(); return true; }
    catch { return false; }
  }
  $('save-page').onclick = () => { endText(); save(); };
  $('publish-page').onclick = async () => {
    if (publishing) return;
    endText();
    publishing = true;
    const button = $('publish-page');
    button.disabled = true; button.textContent = 'Publishing…'; button.setAttribute('aria-busy', 'true');
    $('save-page').disabled = true; $('deployment-link').hidden = true;
    // Freeze the authored snapshot while pending uploads/save/Git settle. The
    // status remains outside the inert control rows and available to readers.
    const controls = [app.viewport, $('properties'), ...$('editor-tools').querySelectorAll('.tool-row')];
    controls.forEach(node => { node.inert = true; });
    status('Saving...');
    try {
      if (drawing?.points.length) throw new Error('Finish or cancel the line before publishing.');
      await autosave.flush();
      status('Committing…');
      const response = await fetch('/_zibaldone/api/publish', { method: 'POST', headers: { 'X-Zibaldone-Token': token } });
      if (!response.ok) throw new Error((await response.json()).error || 'Local publishing request failed.');
      const reader = response.body.getReader(), decoder = new TextDecoder();
      let buffer = '', finished = false;
      const receive = event => {
        if (event.actionsURL && /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/actions$/.test(event.actionsURL)) {
          $('deployment-link').href = event.actionsURL; $('deployment-link').hidden = false;
        }
        if (event.state === 'error') throw new Error(event.error);
        if (event.state === 'building') status('Building…');
        if (event.state === 'committing') status('Committing…');
        if (event.state === 'pushing') status('Pushing…');
        if (event.state === 'success') { status(`Pushed successfully.${event.commit ? ' ' + event.commit : ''} GitHub Pages deployment is not yet confirmed.`); finished = true; }
        if (event.state === 'nothing') { status('Nothing new to publish'); finished = true; }
      };
      try {
        while (true) {
          const { done, value } = await reader.read();
          buffer += decoder.decode(value, { stream: !done });
          let end;
          while ((end = buffer.indexOf('\n')) >= 0) { const line = buffer.slice(0, end); buffer = buffer.slice(end + 1); if (line) receive(JSON.parse(line)); }
          if (done) break;
        }
        if (!finished) throw new Error('The connection closed before a result arrived. Check Git status before retrying; publishing may still be running.');
      } finally { reader.releaseLock(); }
    } catch (error) { report(new Error('Publishing failed: ' + (error?.message || 'Could not save the current canvas.'))); }
    finally {
      publishing = false;
      controls.forEach(node => { node.inert = false; });
      button.disabled = false; button.textContent = 'Publish'; button.removeAttribute('aria-busy');
      $('save-page').disabled = false;
      app.camera.releaseSpace();
    }
  };
  $('download-draft').onclick = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(app.page, null, 2) + '\n'], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `${app.page.slug}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  window.addEventListener('beforeunload', event => {
    rememberDraft();
    if (!app.trail.departing && (history.isDirty(app.page) || uploads || publishing || drawing?.points.length)) {
      autosave.flush().catch(() => {}); event.preventDefault(); event.returnValue = '';
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { rememberDraft(); autosave.flush().catch(() => {}); }
  });
  window.addEventListener('online', () => { if (dirty) autosave.changed(true); });
  document.addEventListener('click', async event => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || link.hasAttribute('download') || link.target && link.target !== '_self') return;
    const url = new URL(link.href);
    if (url.origin === location.origin && url.pathname === app.base && url.hash.startsWith('#/')) return;
    event.preventDefault();
    if (await prepareLeave()) location.href = url.href;
  });
  function restoreHistory(direction) {
    endText(); cancelLine();
    app.camera.gesture?.cancel?.(); app.camera.gesture = null;
    const page = history[direction]();
    if (!page) return;
    app.page = page;
    redraw(); syncDirty(); autosave.changed();
  }
  $('undo').onclick = () => restoreHistory('undo');
  $('redo').onclick = () => restoreHistory('redo');

  let clipboard = '', pasted = '', pasteOffset = 0;
  function rememberClipboard(text) {
    clipboard = text;
    try { localStorage.setItem('space-clipboard', text); } catch { /* In-memory fallback. */ }
  }
  function fallbackClipboard() {
    try { return localStorage.getItem('space-clipboard') || clipboard; } catch { return clipboard; }
  }
  function pasteElements(elements, offset = 1) {
    endText(); cancelLine();
    const copies = cloneElements(elements, offset);
    validatePage({ ...app.page, elements: [...app.page.elements, ...copies] });
    app.page.elements.push(...copies);
    for (const e of copies) app.world.append(app.makeObject(e));
    setSelection(copies.map(e => e.id)); changed();
  }
  // Clipboard events work without clipboard-read permission. A local copy also
  // survives navigation between canvases when the system clipboard is unavailable.
  for (const operation of ['copy', 'cut']) window.addEventListener(operation, event => {
    if (publishing || navigating || leaveTask || app.invalid || isTyping(event.target) || event.target.closest?.('#breadcrumbs') || document.querySelector('dialog[open]') || !selection.size) return;
    const text = encodeClipboard(selectedElements());
    event.clipboardData?.setData('text/plain', text); rememberClipboard(text);
    event.preventDefault();
    if (operation === 'cut') removeSelected();
  });
  window.addEventListener('paste', event => {
    if (publishing || navigating || leaveTask || app.invalid || isTyping(event.target) || event.target.closest?.('#breadcrumbs') || document.querySelector('dialog[open]')) return;
    const text = event.clipboardData?.getData('text/plain') || fallbackClipboard();
    try {
      const elements = decodeClipboard(text);
      if (!elements?.length) return;
      event.preventDefault();
      pasteOffset = text === pasted ? pasteOffset + 1 : 1; pasted = text;
      pasteElements(elements, pasteOffset);
    } catch (error) { report(error); }
  });
  window.addEventListener('keydown', event => {
    if (document.querySelector('dialog[open]')) return;
    const key = event.key.toLowerCase(), command = event.ctrlKey || event.metaKey;
    if (command && key === 's') { event.preventDefault(); save(); return; }
    if (publishing || navigating || leaveTask || app.invalid || event.target.closest('#breadcrumbs')) return;
    if (event.key === 'Escape') {
      app.camera.gesture?.cancel?.(); app.camera.gesture = null;
      endText(); cancelLine(); select(null); return;
    }
    if (isTyping(event.target)) return;
    if (drawing && ['Enter', 'Backspace', 'Tab'].includes(event.key)) {
      event.preventDefault();
      if (event.key === 'Enter') finishLine(true);
      if (event.key === 'Tab') { drawing.horizontalFirst = !drawing.horizontalFirst; previewLine(); }
      if (event.key === 'Backspace') {
        drawing.points.splice(drawing.steps.pop() ?? 0);
        if (!drawing.points.length) { app.nodes.get(drawing.id)?.remove(); app.nodes.delete(drawing.id); drawing.preview = []; }
        else previewLine();
      }
      return;
    }
    if (command && (key === 'z' || key === 'y')) {
      event.preventDefault(); restoreHistory(key === 'y' || event.shiftKey ? 'redo' : 'undo'); return;
    }
    if (command && key === 'd') {
      event.preventDefault(); if (selection.size) pasteElements(selectedElements()); return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); removeSelected(); }
    if (event.key === 'Enter' && selected) { event.preventDefault(); editText(); }
    const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (direction && selection.size) {
      event.preventDefault();
      const amount = event.shiftKey ? 5 : 1;
      for (const e of selectedElements().filter(e => !e.locked)) { translateElement(e, direction[0] * amount, direction[1] * amount); update(e); }
      refreshProperties(); changed();
    }
  });

  $('page-picker').onchange = async () => {
    const url = canvasURL(pageURL($('page-picker').value), app.trail.ids, app.base, true, location.origin);
    if (!await app.trail.navigate(url)) $('page-picker').value = app.page.slug;
  };
  $('new-page').onclick = () => { $('new-page-error').textContent = ''; $('new-page-dialog').showModal(); };
  $('cancel-new').onclick = () => $('new-page-dialog').close();
  $('new-page-form').onsubmit = async event => {
    event.preventDefault();
    if (!await prepareLeave()) return;
    const button = event.submitter;
    button.disabled = true;
    try {
      const slug = $('new-slug').value.trim();
      const page = validatePage({ slug, camera: { x: 0, y: 0, zoom: 1 }, elements: [] });
      await api(`/_zibaldone/api/pages/${slug}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'If-None-Match': '*' }, body: JSON.stringify(page) });
      dirty = false;
      const url = canvasURL(pageURL(slug), app.trail.ids, app.base, true, location.origin);
      $('new-page-dialog').close();
      listPages().catch(report);
      app.trail.navigate(url, true);
    } catch (error) { $('new-page-error').textContent = error.message; }
    finally { button.disabled = false; }
  };

  async function addImages(files, point) {
    uploads++;
    try {
      for (const [index, file] of [...files].entries()) {
        status('Saving...');
        // Decode before writing so invalid files do not leave assets behind.
        const localURL = URL.createObjectURL(file);
        const image = new Image();
        try { image.src = localURL; await image.decode(); }
        finally { URL.revokeObjectURL(localURL); }
        const { src } = await api('/_zibaldone/api/images', { method: 'POST', headers: { 'Content-Type': file.type }, body: file });
        const e = { id: crypto.randomUUID(), type: 'image', x: snap(point.x + index, snapped()), y: snap(point.y + index, snapped()), width: 12, height: 12 * image.naturalHeight / image.naturalWidth, src, alt: '' };
        app.page.elements.push(e);
        app.world.append(app.makeObject(e));
        select(e.id);
        changed();

      }
      return { ok: true };
    } catch (error) { uploadError = Object.assign(error, { status: error.status || 400 }); return { ok: false, error }; }
    finally { uploads--; }
  }
  function queueImages(files, point) {
    uploadError = null;
    const task = addImages(files, point);
    pendingImages.add(task);
    task.finally(() => { pendingImages.delete(task); autosave.changed(true); });
    autosave.flush().catch(() => {});
  }
  $('add-image').onclick = () => $('image-input').click();
  startAutosave(); recoverDraft();
  decorateSelection();
  $('image-input').onchange = () => { queueImages($('image-input').files, { ...app.camera.value }); $('image-input').value = ''; };
  app.viewport.addEventListener('dragover', event => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; });
  app.viewport.addEventListener('drop', event => { event.preventDefault(); queueImages(event.dataTransfer.files, app.camera.toWorld(app.camera.point(event))); });
}
