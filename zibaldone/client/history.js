// Development-only. Snapshots are taken at completed edits, never pointer moves.
export class History {
  constructor(page, limit = 100) {
    this.limit = limit;
    this.states = [JSON.stringify(page)];
    this.index = 0;
    this.saved = this.states[0];
  }
  commit(page) {
    const state = JSON.stringify(page);
    if (state === this.states[this.index]) return false;
    this.states.splice(this.index + 1);
    this.states.push(state);
    if (this.states.length > this.limit + 1) this.states.shift();
    this.index = this.states.length - 1;
    return true;
  }
  undo() { return this.index ? JSON.parse(this.states[--this.index]) : null; }
  redo() { return this.index < this.states.length - 1 ? JSON.parse(this.states[++this.index]) : null; }
  markSaved(snapshot) { this.saved = typeof snapshot === 'string' ? snapshot : JSON.stringify(snapshot); }
  isDirty(page) { return JSON.stringify(page) !== this.saved; }
}
