const DB_NAME    = "fxf-viewer";
const DB_VERSION = 1;
const STORE_NAME = "uploaded-files";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

export async function saveFile(key, file) {
  const buf = await file.arrayBuffer();
  const db  = await openDb();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, "readwrite");
    const st  = tx.objectStore(STORE_NAME);
    st.put({ name: file.name, buf, savedAt: Date.now() }, key);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

export async function loadFile(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror   = () => reject(req.error);
  });
}

export async function loadAllFiles(keys) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx      = db.transaction(STORE_NAME, "readonly");
    const store   = tx.objectStore(STORE_NAME);
    const results = {};
    let pending   = keys.length;
    if (!pending) { resolve(results); return; }
    for (const key of keys) {
      const req = store.get(key);
      req.onsuccess = () => {
        results[key] = req.result ?? null;
        if (--pending === 0) resolve(results);
      };
      req.onerror = () => reject(req.error);
    }
  });
}

export async function deleteFile(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

// Convert a stored {name, buf} record back to a File object for re-parsing
export function storedToFile(record) {
  if (!record) return null;
  return new File([record.buf], record.name, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export function formatSavedAt(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleString(undefined, { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" });
}
