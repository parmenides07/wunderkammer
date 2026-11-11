import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Autosave } from '../client/autosave.js';
import { History } from '../client/history.js';
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const gate = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

test('autosave debounces rapid changes and writes only the newest snapshot', async t => {
  let page = 'initial'; const writes = [];
  const save = new Autosave({ snapshot: () => page, saved: page, delay: 15, write: async s => writes.push(s) });
  t.after(() => save.close());
  for (const value of ['a', 'ab', 'abc']) { page = value; save.changed(); }
  assert.deepEqual(writes, []); await wait(40);
  assert.deepEqual(writes, ['abc']); assert.equal(save.saved, 'abc');
  await save.flush(); assert.equal(writes.length, 1);
});

test('concurrent flushes share one queue; edits during a write use its acknowledged revision', async t => {
  let page = 'a', revision = 0, active = 0; const writes = [], first = gate();
  const save = new Autosave({ snapshot: () => page, saved: '', write: async s => {
    assert.equal(++active, 1); writes.push([s, revision]);
    if (s === 'a') await first.promise;
    revision++; active--;
  } });
  t.after(() => save.close());
  const task = save.flush(); assert.equal(save.flush(), task); await wait(0);
  page = 'b'; save.changed(); page = 'newest'; save.changed();
  first.resolve(); await task;
  assert.deepEqual(writes, [['a', 0], ['newest', 1]]); assert.equal(save.saved, 'newest');
});

test('drag and upload gates delay snapshot capture until the completed state', async t => {
  let page = 'before'; const uploaded = gate(), writes = [];
  const save = new Autosave({ snapshot: () => page, saved: '', ready: () => uploaded.promise, write: async s => writes.push(s) });
  t.after(() => save.close()); save.pause();
  const task = save.flush(); page = 'moving'; await wait(0); assert.deepEqual(writes, []);
  save.resume(); await wait(0); assert.deepEqual(writes, []);
  page = 'finished with /assets/final.png'; uploaded.resolve(); await task;
  assert.deepEqual(writes, [page]);
});

test('revision conflicts retain unsaved state and never retry or overwrite on further edits', async t => {
  let page = 'draft', attempts = 0; const states = [];
  const error = Object.assign(new Error('Conflict'), { status: 409 });
  const save = new Autosave({ snapshot: () => page, saved: 'disk', state: s => states.push(s), write: async () => { attempts++; throw error; } });
  t.after(() => save.close());
  await assert.rejects(save.flush(), /Conflict/); page = 'new draft'; save.changed(true);
  await assert.rejects(save.flush(), /Conflict/); await wait(10);
  assert.equal(attempts, 1); assert.equal(save.saved, 'disk'); assert.equal(states.at(-1), 'Save failed');
});

test('transient failures can retry safely without claiming a save succeeded', async t => {
  let fail = true; const states = [];
  const save = new Autosave({ snapshot: () => 'draft', saved: 'disk', state: s => states.push(s), write: async () => { if (fail) throw new Error('Offline'); } });
  t.after(() => save.close());
  await assert.rejects(save.flush(), /Offline/); assert.equal(save.saved, 'disk');
  assert.equal(states.at(-1), 'Save failed'); fail = false; await save.flush();
  assert.equal(save.saved, 'draft'); assert.equal(states.at(-1), 'Saved');
});

test('acknowledging autosaves preserves undo/redo history and its saved-state detection', async t => {
  let page = { text: 'before' }; const history = new History(page);
  const save = new Autosave({ snapshot: () => JSON.stringify(page), saved: history.saved,
    write: async () => {}, persisted: s => history.markSaved(s) });
  t.after(() => save.close()); page = { text: 'after' }; history.commit(page); await save.flush();
  assert.equal(history.states.length, 2); assert.equal(history.isDirty(page), false);
  page = history.undo(); assert.equal(history.isDirty(page), true); await save.flush();
  assert.equal(history.isDirty(page), false); page = history.redo(); await save.flush();
  assert.equal(page.text, 'after'); assert.equal(history.states.length, 2);
});
