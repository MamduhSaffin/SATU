export type LocalNotificationRequest = {
  id: string;
  title: string;
  body?: string;
  at: number;
  repeatEveryMs?: number;
  category?: 'health' | 'hydration' | 'task' | 'travel' | 'general';
};

export interface LocalNotificationAdapter {
  schedule(request: LocalNotificationRequest): Promise<void>;
  cancel(id: string): Promise<void>;
  cancelAll(): Promise<void>;
}

export class NoopNotificationAdapter implements LocalNotificationAdapter {
  async schedule(): Promise<void> {}
  async cancel(): Promise<void> {}
  async cancelAll(): Promise<void> {}
}
