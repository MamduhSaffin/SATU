import type { LocalStore } from '../core/storage/indexedDb';

export type ReminderKind = 'medication' | 'hydration' | 'meeting' | 'bus' | 'family';

export type ReminderSchedule =
  | { kind: 'daily'; time: string }
  | { kind: 'interval'; everyMinutes: number; startAt: number }
  | { kind: 'once'; at: number };

export type TemanReminder = {
  id: string;
  kind: ReminderKind;
  title: string;
  enabled: boolean;
  schedule: ReminderSchedule;
  createdAt: number;
  lastTriggeredAt?: number;
};

const REMINDER_KEY = 'teman.reminders.v1';

const KIND_TITLES: Record<ReminderKind, string> = {
  medication: 'Ambil ubat',
  hydration: 'Minum air',
  meeting: 'Tempat berkumpul',
  bus: 'Bas akan bergerak',
  family: 'Check-in dengan keluarga',
};

function id(kind: ReminderKind): string {
  return `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createReminder(kind: ReminderKind, now = Date.now()): TemanReminder {
  if (kind === 'hydration') {
    return {
      id: id(kind),
      kind,
      title: KIND_TITLES[kind],
      enabled: true,
      schedule: { kind: 'interval', everyMinutes: 120, startAt: now + 120 * 60 * 1000 },
      createdAt: now,
    };
  }

  if (kind === 'meeting' || kind === 'bus') {
    return {
      id: id(kind),
      kind,
      title: KIND_TITLES[kind],
      enabled: true,
      schedule: { kind: 'once', at: now + (kind === 'meeting' ? 60 : 120) * 60 * 1000 },
      createdAt: now,
    };
  }

  return {
    id: id(kind),
    kind,
    title: KIND_TITLES[kind],
    enabled: true,
    schedule: { kind: 'daily', time: kind === 'medication' ? '08:00' : '20:00' },
    createdAt: now,
  };
}

export async function loadReminders(store: LocalStore): Promise<TemanReminder[]> {
  return (await store.get<TemanReminder[]>(REMINDER_KEY)) ?? [];
}

export async function saveReminders(store: LocalStore, reminders: TemanReminder[]): Promise<void> {
  await store.set(REMINDER_KEY, reminders);
}

function todayAt(time: string, now: number): number {
  const [hourText, minuteText] = time.split(':');
  const date = new Date(now);
  date.setHours(Number(hourText || 0), Number(minuteText || 0), 0, 0);
  return date.getTime();
}

export function currentDueSlot(reminder: TemanReminder, now = Date.now()): number | undefined {
  if (!reminder.enabled) return undefined;

  if (reminder.schedule.kind === 'once') {
    const scheduled = reminder.schedule.at;
    return now >= scheduled && (reminder.lastTriggeredAt ?? 0) < scheduled ? scheduled : undefined;
  }

  if (reminder.schedule.kind === 'daily') {
    const scheduled = todayAt(reminder.schedule.time, now);
    return now >= scheduled && (reminder.lastTriggeredAt ?? 0) < scheduled ? scheduled : undefined;
  }

  const { startAt, everyMinutes } = reminder.schedule;
  if (now < startAt) return undefined;
  const interval = Math.max(15, everyMinutes) * 60 * 1000;
  const slot = startAt + Math.floor((now - startAt) / interval) * interval;
  return (reminder.lastTriggeredAt ?? 0) < slot ? slot : undefined;
}

export function nextOccurrence(reminder: TemanReminder, now = Date.now()): number | undefined {
  if (!reminder.enabled) return undefined;

  if (reminder.schedule.kind === 'once') {
    return reminder.schedule.at;
  }

  if (reminder.schedule.kind === 'daily') {
    const today = todayAt(reminder.schedule.time, now);
    if (today > now) return today;
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.getTime();
  }

  const interval = Math.max(15, reminder.schedule.everyMinutes) * 60 * 1000;
  if (now < reminder.schedule.startAt) return reminder.schedule.startAt;
  return reminder.schedule.startAt + (Math.floor((now - reminder.schedule.startAt) / interval) + 1) * interval;
}

export function reminderKindLabel(kind: ReminderKind): string {
  return KIND_TITLES[kind];
}
