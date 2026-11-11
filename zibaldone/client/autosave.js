// Development-only persistence queue. History and DOM editing stay independent.
export class Autosave {
  constructor({ snapshot, write, ready = async () => {}, saved, state = () => {}, persisted = () => {}, delay = 600 }) {
    Object.assign(this, { snapshot, write, ready, saved, state, persisted, delay });
    this.retries = 0;
  }
  changed(immediate = false) {
    clearTimeout(this.timer);
    if (this.closed) return;
    if (this.error?.status === 409) { this.state('Save failed', this.error); return; }
    if (this.snapshot() === this.saved && !this.task && !this.error) { this.state('Saved'); return; }
    this.state('Saving...');
    this.timer = setTimeout(() => this.flush().catch(() => {}), immediate ? 0 : this.delay);
  }
  pause() {
    if (!this.hold) this.hold = new Promise(resolve => { this.release = resolve; });
  }
  resume() { this.release?.(); this.hold = this.release = null; }
  flush() {
    clearTimeout(this.timer);
    if (this.task) return this.task;
    if (this.error?.status === 409) return Promise.reject(this.error);
    this.task = this.run().finally(() => { this.task = null; });
    return this.task;
  }
  async run() {
    try {
      this.state('Saving...');
      while (!this.closed) {
        await this.hold;
        await this.ready();
        // A drag may have started while uploads were settling.
        if (this.hold) continue;
        const snapshot = this.snapshot();
        if (snapshot === this.saved) break;
        await this.write(snapshot);
        this.saved = snapshot;
        this.persisted(snapshot);
        // Read again only after acknowledgement; a newer edit queues the next
        // snapshot with the new revision, never a concurrent PUT.
      }
      this.error = null; this.retries = 0;
      this.state('Saved');
    } catch (error) {
      this.error = error;
      this.state('Save failed', error);
      if (!this.closed && (!error.status || error.status >= 500) && this.retries < 3) {
        this.timer = setTimeout(() => this.flush().catch(() => {}), [2000, 5000, 10000][this.retries++]);
      }
      throw error;
    }
  }
  close() { this.closed = true; clearTimeout(this.timer); this.resume(); }
}
