/**
 * IndexedDB Persistence Layer — Transaction Cache
 *
 * Stores the parsed Transaction[] dataset so the dashboard survives page
 * refreshes without requiring the user to re-upload their Excel file.
 *
 * Design decisions:
 *  - IndexedDB is used (not localStorage) because a typical Money Manager
 *    export can exceed the 5 MB localStorage limit.
 *  - Date objects are serialised as ISO strings and re-hydrated on load.
 *  - Every public function is best-effort: errors are silently swallowed so
 *    a broken IDB environment never crashes the main application.
 */

import { Transaction } from './types.js';

const DB_NAME    = 'ledgerly';
const DB_VERSION = 1;
const STORE_NAME = 'cache';
const CACHE_KEY  = 'transactions';

export interface CacheMeta {
  fileName: string;
  rowCount: number;
  currency: string;
  currencySymbol: string;
  savedAt: number; // Date.now() timestamp
}

export interface CachePayload {
  transactions: Transaction[];
  meta: CacheMeta;
}

// Internal serialisation shape (dates stored as ISO strings)
interface RawPayload {
  transactions: Array<Omit<Transaction, 'date'> & { date: string }>;
  meta: CacheMeta;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

/**
 * Persist the parsed transaction dataset to IndexedDB.
 * Call this after a successful file import (fire-and-forget is fine).
 */
export async function saveTransactions(
  transactions: Transaction[],
  meta: CacheMeta
): Promise<void> {
  const payload: RawPayload = {
    transactions: transactions.map(t => ({
      ...t,
      date: t.date.toISOString()
    })),
    meta
  };
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(payload, CACHE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

/**
 * Load the most recently cached transaction dataset from IndexedDB.
 * Returns null if no cache exists or if any error occurs.
 */
export async function loadTransactions(): Promise<CachePayload | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(CACHE_KEY);
      req.onsuccess = () => {
        const raw = req.result as RawPayload | undefined;
        if (!raw || !Array.isArray(raw.transactions) || raw.transactions.length === 0) {
          return resolve(null);
        }
        // Re-hydrate Date objects from ISO strings
        const transactions: Transaction[] = raw.transactions.map(t => ({
          ...t,
          date: new Date(t.date)
        }));
        resolve({ transactions, meta: raw.meta });
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/**
 * Remove the cached dataset from IndexedDB.
 * Call this when the user explicitly clears their workspace.
 */
export async function clearTransactions(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(CACHE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror    = () => resolve(); // best-effort
    });
  } catch {
    // Silently ignore — cache clear is best-effort
  }
}
