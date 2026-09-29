import type { LocalStore } from '../storage/indexedDb';

export type SyncAction = 'create' | 'update' | 'delete';

export type SyncOperation<T = unknown> = {
  id: string;
  channel: string;
  action: SyncAction;
  payload: T;
  createdAt: number;
  attempts: number;
  lastError?: string;
};

const QUEUE_KEY = 'core.sync.queue';

function makeId(): string {
  if ('crypto' in globalThis && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export class OfflineSyncQueue {
  constructor(private readonly store: LocalStore) {}

  async list(): Promise<SyncOperation[]> {
    return (await this.store.get<SyncOperation[]>(QUEUE_KEY)) ?? [];
  }

  async enqueue<T>(channel: string, action: SyncAction, payload: T): Promise<SyncOperation<T>> {
    const queue = await this.list();
    const operation: SyncOperation<T> = {
      id: makeId(),
      channel,
      action,
      payload,
      createdAt: Date.now(),
      attempts: 0,
    };
    queue.push(operation);
    await this.store.set(QUEUE_KEY, queue);
    return operation;
  }

  async next(limit = 20): Promise<SyncOperation[]> {
    const queue = await this.list();
    return queue.slice(0, Math.max(1, limit));
  }

  async markDone(id: string): Promise<void> {
    const queue = await this.list();
    await this.store.set(
      QUEUE_KEY,
      queue.filter((operation) => operation.id !== id),
    );
  }

  async markFailed(id: string, error: unknown): Promise<void> {
    const queue = await this.list();
    const message = error instanceof Error ? error.message : String(error);
    const updated = queue.map((operation) =>
      operation.id === id
        ? { ...operation, attempts: operation.attempts + 1, lastError: message }
        : operation,
    );
    await this.store.set(QUEUE_KEY, updated);
  }

  async clear(): Promise<void> {
    await this.store.remove(QUEUE_KEY);
  }
}
