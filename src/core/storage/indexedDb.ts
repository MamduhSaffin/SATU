export interface LocalStore {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  keys(prefix?: string): Promise<string[]>;
}

type StoredRecord<T = unknown> = {
  key: string;
  value: T;
  updatedAt: number;
};

const DB_NAME = 'tgpu-core';
const STORE_NAME = 'records';
const DB_VERSION = 1;

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

export class IndexedDbLocalStore implements LocalStore {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private open(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    if (!('indexedDB' in globalThis)) {
      throw new Error('IndexedDB is not available on this device');
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Unable to open TGPU Core database'));
    });

    return this.dbPromise;
  }

  async get<T>(key: string): Promise<T | undefined> {
    const db = await this.open();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const record = await requestToPromise<StoredRecord<T> | undefined>(
      tx.objectStore(STORE_NAME).get(key),
    );
    return record?.value;
  }

  async set<T>(key: string, value: T): Promise<void> {
    const db = await this.open();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    await requestToPromise(
      tx.objectStore(STORE_NAME).put({ key, value, updatedAt: Date.now() } satisfies StoredRecord<T>),
    );
  }

  async remove(key: string): Promise<void> {
    const db = await this.open();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    await requestToPromise(tx.objectStore(STORE_NAME).delete(key));
  }

  async keys(prefix = ''): Promise<string[]> {
    const db = await this.open();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const allKeys = await requestToPromise<IDBValidKey[]>(tx.objectStore(STORE_NAME).getAllKeys());
    return allKeys.map(String).filter((key) => key.startsWith(prefix));
  }
}
