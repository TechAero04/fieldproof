/**
 * FieldProof V2 Offline Sync & IndexedDB Engine
 * Manages client-side offline mutation queue, cached inspection data, and automatic synchronization.
 */

const DB_NAME = 'fieldproof_offline_db';
const DB_VERSION = 1;
const STORE_MUTATIONS = 'mutation_queue';
const STORE_CACHE = 'inspection_cache';

export interface OfflineMutation {
  idempotencyKey: string;
  operation: 'SAVE_DRAFT' | 'SUBMIT_INSPECTION' | 'CAPA_UPDATE';
  entityId: string;
  payload: any;
  createdAt: number;
  retryCount: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not available in this environment'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_MUTATIONS)) {
        db.createObjectStore(STORE_MUTATIONS, { keyPath: 'idempotencyKey' });
      }
      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        db.createObjectStore(STORE_CACHE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Cache an inspection locally for offline use
 */
export async function cacheInspectionOffline(inspection: any): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_CACHE, 'readwrite');
    const store = tx.objectStore(STORE_CACHE);
    store.put(inspection);
  } catch (err) {
    console.warn('Failed to cache inspection offline:', err);
  }
}

/**
 * Retrieve a cached inspection by ID
 */
export async function getCachedInspection(id: string): Promise<any | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_CACHE, 'readonly');
      const store = tx.objectStore(STORE_CACHE);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Enqueue a mutation for offline synchronization
 */
export async function queueOfflineMutation(
  operation: 'SAVE_DRAFT' | 'SUBMIT_INSPECTION' | 'CAPA_UPDATE',
  entityId: string,
  payload: any
): Promise<string> {
  const idempotencyKey = `fp_sync_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const mutation: OfflineMutation = {
    idempotencyKey,
    operation,
    entityId,
    payload,
    createdAt: Date.now(),
    retryCount: 0,
  };

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_MUTATIONS, 'readwrite');
    const store = tx.objectStore(STORE_MUTATIONS);
    store.put(mutation);
  } catch (err) {
    console.warn('Failed to queue mutation to IndexedDB, fallback to localStorage:', err);
    if (typeof window !== 'undefined') {
      const key = `fp_offline_${idempotencyKey}`;
      localStorage.setItem(key, JSON.stringify(mutation));
    }
  }

  return idempotencyKey;
}

/**
 * Get all queued mutations
 */
export async function getQueuedMutations(): Promise<OfflineMutation[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_MUTATIONS, 'readonly');
      const store = tx.objectStore(STORE_MUTATIONS);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * Remove processed mutation from queue
 */
export async function removeQueuedMutation(idempotencyKey: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_MUTATIONS, 'readwrite');
    const store = tx.objectStore(STORE_MUTATIONS);
    store.delete(idempotencyKey);
  } catch (err) {
    console.warn('Failed to delete mutation from IndexedDB:', err);
  }
}

/**
 * Dispatch all queued mutations to server API
 */
export async function syncPendingMutations(): Promise<{ synced: number; failed: number }> {
  if (typeof window === 'undefined' || !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  const mutations = await getQueuedMutations();
  if (mutations.length === 0) return { synced: 0, failed: 0 };

  try {
    const res = await fetch('/api/inspections/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operations: mutations }),
    });

    if (!res.ok) {
      throw new Error(`Sync server responded with ${res.status}`);
    }

    const data = await res.json();
    let synced = 0;
    let failed = 0;

    for (const result of data.results || []) {
      if (result.status === 'PROCESSED' || result.status === 'ALREADY_PROCESSED') {
        await removeQueuedMutation(result.idempotencyKey);
        synced++;
      } else {
        failed++;
      }
    }

    return { synced, failed };
  } catch (err) {
    console.error('Failed to sync mutations:', err);
    return { synced: 0, failed: mutations.length };
  }
}
