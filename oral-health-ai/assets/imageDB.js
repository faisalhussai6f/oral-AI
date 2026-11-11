/**
 * ImageDB — IndexedDB wrapper for scan images
 * =============================================
 * Stores scan images separately from localStorage so they never hit the 5MB quota.
 * localStorage only holds metadata (score, findings, etc).
 * Images are stored as base64 data URLs keyed by scan ID.
 *
 * API:
 *   ImageDB.save(scanId, dataUrl)  → Promise<void>
 *   ImageDB.load(scanId)           → Promise<string|null>
 *   ImageDB.delete(scanId)         → Promise<void>
 *   ImageDB.clear()                → Promise<void>
 */
const ImageDB = (() => {
  const DB_NAME    = 'oralai_images';
  const STORE_NAME = 'images';
  const DB_VERSION = 1;

  let _db = null;

  function open() {
    if (_db) return Promise.resolve(_db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = e => {
        e.target.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
      };
      req.onsuccess = e => { _db = e.target.result; resolve(_db); };
      req.onerror   = e => reject(e.target.error);
    });
  }

  function tx(mode) {
    return open().then(db => db.transaction(STORE_NAME, mode).objectStore(STORE_NAME));
  }

  return {
    /** Save a data URL for a scan ID. Silently ignores if IndexedDB unavailable. */
    save(scanId, dataUrl) {
      if (!dataUrl || !scanId) return Promise.resolve();
      return tx('readwrite')
        .then(store => new Promise((res, rej) => {
          const req = store.put({ id: scanId, dataUrl, ts: Date.now() });
          req.onsuccess = () => res();
          req.onerror   = e => rej(e.target.error);
        }))
        .catch(e => console.warn('[ImageDB] save failed:', e));
    },

    /** Load a data URL by scan ID. Returns null if not found. */
    load(scanId) {
      if (!scanId) return Promise.resolve(null);
      return tx('readonly')
        .then(store => new Promise((res, rej) => {
          const req = store.get(scanId);
          req.onsuccess = e => res(e.target.result?.dataUrl ?? null);
          req.onerror   = e => rej(e.target.error);
        }))
        .catch(() => null);
    },

    /** Delete image for a scan. */
    delete(scanId) {
      if (!scanId) return Promise.resolve();
      return tx('readwrite')
        .then(store => new Promise((res, rej) => {
          const req = store.delete(scanId);
          req.onsuccess = () => res();
          req.onerror   = e => rej(e.target.error);
        }))
        .catch(e => console.warn('[ImageDB] delete failed:', e));
    },

    /** Wipe all stored images. */
    clear() {
      return tx('readwrite')
        .then(store => new Promise((res, rej) => {
          const req = store.clear();
          req.onsuccess = () => res();
          req.onerror   = e => rej(e.target.error);
        }))
        .catch(e => console.warn('[ImageDB] clear failed:', e));
    },

    /**
     * Load images for many scan IDs at once and stamp them onto the scan objects.
     * Mutates scan.imageDataUrl in-place so existing render code needs no change.
     * Returns Promise<void> when all images are loaded.
     */
    stampAll(scans) {
      if (!scans || !scans.length) return Promise.resolve();
      return Promise.all(
        scans.map(s =>
          this.load(s.id).then(url => { if (url) s.imageDataUrl = url; })
        )
      );
    },
  };
})();
