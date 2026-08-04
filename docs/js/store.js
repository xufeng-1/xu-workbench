/* store.js —— IndexedDB 用户数据层 */
(function () {
  const DB_NAME = 'xu-workbench', DB_VER = 1;
  const STORES = ['kv', 'tasks', 'water', 'fitness', 'money', 'words', 'reading', 'workouts', 'custom'];
  let dbPromise = null;
  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((res, rej) => {
      const rq = indexedDB.open(DB_NAME, DB_VER);
      rq.onupgradeneeded = () => {
        const db = rq.result;
        STORES.forEach((s) => { if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' }); });
      };
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => rej(rq.error);
    });
    return dbPromise;
  }
  function tx(store, mode, fn) {
    return open().then((db) => new Promise((res, rej) => {
      const t = db.transaction(store, mode);
      const s = t.objectStore(store);
      let out;
      try { out = fn(s); } catch (e) { rej(e); return; }
      t.oncomplete = () => res(out && out.result !== undefined ? out.result : undefined);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error);
    }));
  }
  const Store = {
    get(store, id) { return tx(store, 'readonly', (s) => s.get(id)).then((r) => r || null); },
    set(store, obj) { return tx(store, 'readwrite', (s) => s.put(obj)); },
    del(store, id) { return tx(store, 'readwrite', (s) => s.delete(id)); },
    all(store) { return tx(store, 'readonly', (s) => s.getAll()); },
    kvGet(key) { return this.get('kv', key).then((r) => (r ? r.v : null)); },
    kvSet(key, v) { return this.set('kv', { id: key, v }); },
    kvDel(key) { return this.del('kv', key); }
  };
  window.XU = window.XU || {};
  XU.Store = Store;
})();
