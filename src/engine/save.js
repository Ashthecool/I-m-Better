// Tiny persistent settings/progress store.
// In the browser this is localStorage; for a Steam/Electron build this is the
// one place to swap in file-based saves or Steam Cloud.
(function () {
  'use strict';
  const G = window.G;
  const KEY = 'imbetter.save.v1';

  G.save = {
    data: {},
    load() {
      try { this.data = JSON.parse(localStorage.getItem(KEY)) || {}; }
      catch (e) { this.data = {}; }
    },
    get(k, d) { return k in this.data ? this.data[k] : d; },
    set(k, v) {
      this.data[k] = v;
      try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* private mode */ }
    },
  };
  G.save.load();
})();
