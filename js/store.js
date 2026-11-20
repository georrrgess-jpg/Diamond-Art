// Versioned local persistence: IndexedDB with a localStorage fallback.
const DB = 'lustra', VER = 1, STORE = 'kv';
export const SCHEMA = 1;
let dbp = null;

function openDB() {
  if (dbp) return dbp;
  dbp = new Promise((res) => {
    try {
      const rq = indexedDB.open(DB, VER);
      rq.onupgradeneeded = () => { if (!rq.result.objectStoreNames.contains(STORE)) rq.result.createObjectStore(STORE); };
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => res(null);
      rq.onblocked = () => res(null);
    } catch { res(null); }
  });
  return dbp;
}

export async function get(key) {
  const db = await openDB();
  if (!db) { try { const v = localStorage.getItem('lustra:' + key); return v ? JSON.parse(v) : undefined; } catch { return undefined; } }
  return new Promise((res) => {
    try {
      const rq = db.transaction(STORE).objectStore(STORE).get(key);
      rq.onsuccess = () => res(rq.result); rq.onerror = () => res(undefined);
    } catch { res(undefined); }
  });
}
export async function set(key, val) {
  const db = await openDB();
  if (!db) { try { localStorage.setItem('lustra:' + key, JSON.stringify(val)); } catch {} return; }
  return new Promise((res) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(val, key);
      tx.oncomplete = () => res(); tx.onerror = () => res(); tx.onabort = () => res();
    } catch { res(); }
  });
}
export async function del(key) {
  const db = await openDB();
  if (!db) { try { localStorage.removeItem('lustra:' + key); } catch {} return; }
  return new Promise((res) => {
    try { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).delete(key); tx.oncomplete = () => res(); tx.onerror = () => res(); } catch { res(); }
  });
}

// Progress record: {schema, art, version, mode, filled:[ids], camera, sel, updated, completed}
export function progressKey(artId, mode = 'number') { return `progress:${artId}:${mode}`; }

// Validate a loaded record against the artwork; never throws.
export function sanitizeProgress(rec, art) {
  if (!rec || typeof rec !== 'object' || !Array.isArray(rec.filled)) return null;
  const n = art.sockets.length;
  const filled = new Uint8Array(n);
  for (const id of rec.filled) if (Number.isInteger(id) && id >= 0 && id < n) filled[id] = 1;
  const cam = rec.camera && [rec.camera.s, rec.camera.x, rec.camera.y].every(Number.isFinite) ? rec.camera : null;
  return { filled, camera: cam, sel: Number.isInteger(rec.sel) ? rec.sel : 0, updated: rec.updated || 0, completed: !!rec.completed };
}
