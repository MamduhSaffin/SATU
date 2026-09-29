export * from './connectivity';
export * from './i18n';
export * from './kira/currency';
export * from './notifications';
export * from './storage/indexedDb';
export * from './sync/queue';

import { IndexedDbLocalStore } from './storage/indexedDb';
import { OfflineSyncQueue } from './sync/queue';

export function createTgpuCore() {
  const store = new IndexedDbLocalStore();
  const syncQueue = new OfflineSyncQueue(store);

  return {
    store,
    syncQueue,
  };
}
