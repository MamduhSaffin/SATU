import { useCallback, useEffect, useMemo, useState } from 'react';
import { IndexedDbLocalStore } from '../core/storage/indexedDb';
import {
  createReminder,
  currentDueSlot,
  loadReminders,
  nextOccurrence,
  reminderKindLabel,
  saveReminders,
  type ReminderKind,
  type TemanReminder,
} from './reminders';
import './teman-offline.css';
import './teman-reminders.css';

const store = new IndexedDbLocalStore();

function formatDateTime(value?: number): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('ms-MY', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toLocalInput(value: number): string {
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function kindIcon(kind: ReminderKind): string {
  return ({ medication: '💊', hydration: '💧', meeting: '📍', bus: '🚌', family: '👪' } as const)[kind];
}

export default function ReminderApp() {
  const [reminders, setReminders] = useState<TemanReminder[]>([]);
  const [online, setOnline] = useState(navigator.onLine);
  const [message, setMessage] = useState('');
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(
    'Notification' in window ? Notification.permission : 'unsupported',
  );

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  useEffect(() => {
    void loadReminders(store).then(setReminders);
  }, []);

  const persist = useCallback(async (next: TemanReminder[]) => {
    setReminders(next);
    await saveReminders(store, next);
  }, []);

  const notify = useCallback((reminder: TemanReminder) => {
    const body = reminder.kind === 'family'
      ? 'Buka Family Link dan hantar check-in kepada keluarga.'
      : reminder.title;
    setMessage(`PERINGATAN: ${reminder.title}`);
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('TEMAN Haramain', {
          body,
          icon: '/satu-icon.svg',
          tag: `teman-reminder-${reminder.id}`,
        });
      } catch {
        // In-app reminder remains available if the browser blocks system notifications.
      }
    }
  }, []);

  const runDueCheck = useCallback(async () => {
    const now = Date.now();
    let changed = false;
    const next = reminders.map((reminder) => {
      const dueSlot = currentDueSlot(reminder, now);
      if (!dueSlot) return reminder;
      changed = true;
      notify(reminder);
      return { ...reminder, lastTriggeredAt: now };
    });
    if (changed) await persist(next);
  }, [reminders, notify, persist]);

  useEffect(() => {
    void runDueCheck();
    const timer = window.setInterval(() => void runDueCheck(), 30_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void runDueCheck();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [runDueCheck]);

  const sorted = useMemo(() => [...reminders].sort((a, b) => {
    const aNext = nextOccurrence(a) ?? Number.MAX_SAFE_INTEGER;
    const bNext = nextOccurrence(b) ?? Number.MAX_SAFE_INTEGER;
    return aNext - bNext;
  }), [reminders]);

  async function add(kind: ReminderKind) {
    const next = [...reminders, createReminder(kind)];
    await persist(next);
    setMessage(`${reminderKindLabel(kind)} ditambah dan disimpan offline.`);
  }

  async function update(id: string, transform: (reminder: TemanReminder) => TemanReminder) {
    await persist(reminders.map((item) => item.id === id ? transform(item) : item));
  }

  async function remove(id: string) {
    await persist(reminders.filter((item) => item.id !== id));
    setMessage('Peringatan dipadam dari telefon.');
  }

  async function requestNotifications() {
    if (!('Notification' in window)) {
      setNotificationPermission('unsupported');
      setMessage('Peranti/browser ini tidak menyokong notifikasi web. Peringatan dalam TEMAN masih berfungsi apabila aplikasi dibuka.');
      return;
    }
    try {
      const result = await Notification.requestPermission();
      setNotificationPermission(result);
      setMessage(result === 'granted'
        ? 'Notifikasi peranti dibenarkan.'
        : 'Notifikasi peranti tidak dibenarkan. Peringatan dalam TEMAN masih disimpan offline.');
    } catch {
      setMessage('Tidak dapat meminta kebenaran notifikasi pada browser ini.');
    }
  }

  return <main className="teman-app">
    <header className="teman-header">
      <div><strong>TEMAN Peringatan</strong><span> by <b>TGPU</b></span></div>
      <div className={online ? 'status online' : 'status offline'}>{online ? 'Online' : 'Offline • jadual masih tersimpan'}</div>
    </header>

    <button className="back" onClick={() => { window.location.href = '/?app=teman'; }}>← Kembali ke TEMAN</button>

    <section className="teman-content">
      <div className="hero">
        <div className="eyebrow">Offline Reminder Centre</div>
        <h1>Ingat perkara penting.</h1>
        <p>Jadual disimpan pada telefon. Internet tidak diperlukan untuk melihat atau mengubah peringatan.</p>
      </div>

      {!online && <div className="offline-banner">OFFLINE • Jadual peringatan masih tersedia</div>}
      {message && <div className="saved-banner">{message}</div>}

      <div className="ready-panel success">
        <strong>Notifikasi peranti</strong>
        <p>Status: {notificationPermission === 'granted' ? 'Dibenarkan' : notificationPermission === 'denied' ? 'Disekat' : notificationPermission === 'unsupported' ? 'Tidak disokong' : 'Belum diminta'}.</p>
        {notificationPermission !== 'granted' && notificationPermission !== 'unsupported' &&
          <button className="primary big" onClick={() => void requestNotifications()}>BENARKAN NOTIFIKASI</button>}
      </div>

      <h2>Tambah Pantas</h2>
      <div className="reminder-add-grid">
        <button className="action big" onClick={() => void add('medication')}>💊 UBAT<span>Setiap hari • 8:00 pagi</span></button>
        <button className="action big" onClick={() => void add('hydration')}>💧 MINUM AIR<span>Setiap 2 jam</span></button>
        <button className="action big" onClick={() => void add('meeting')}>📍 MEETING POINT<span>Sekali • 1 jam dari sekarang</span></button>
        <button className="action big" onClick={() => void add('bus')}>🚌 BAS<span>Sekali • 2 jam dari sekarang</span></button>
        <button className="action big" onClick={() => void add('family')}>👪 FAMILY CHECK-IN<span>Setiap hari • 8:00 malam</span></button>
      </div>

      <h2>Peringatan Saya</h2>
      {sorted.length === 0 && <div className="ready-panel warning"><strong>Belum ada peringatan.</strong><p>Tambah hanya yang benar-benar diperlukan supaya TEMAN kekal ringkas.</p></div>}

      <div className="reminder-list">
        {sorted.map((reminder) => <article className="reminder-card" key={reminder.id}>
          <div className="reminder-card-head">
            <div className="reminder-icon">{kindIcon(reminder.kind)}</div>
            <div className="reminder-title-block">
              <strong>{reminderKindLabel(reminder.kind)}</strong>
              <input
                aria-label="Nama peringatan"
                value={reminder.title}
                onChange={(event) => void update(reminder.id, (item) => ({ ...item, title: event.target.value.slice(0, 80) }))}
              />
            </div>
            <label className="reminder-toggle">
              <input type="checkbox" checked={reminder.enabled} onChange={(event) => void update(reminder.id, (item) => ({ ...item, enabled: event.target.checked }))} />
              <span>{reminder.enabled ? 'ON' : 'OFF'}</span>
            </label>
          </div>

          {reminder.schedule.kind === 'daily' && <label className="field">
            <span>Masa setiap hari</span>
            <input type="time" value={reminder.schedule.time} onChange={(event) => void update(reminder.id, (item) => ({ ...item, schedule: { kind: 'daily', time: event.target.value }, lastTriggeredAt: undefined }))} />
          </label>}

          {reminder.schedule.kind === 'interval' && <label className="field">
            <span>Ulang setiap</span>
            <select value={reminder.schedule.everyMinutes} onChange={(event) => void update(reminder.id, (item) => ({ ...item, schedule: { kind: 'interval', everyMinutes: Number(event.target.value), startAt: Date.now() + Number(event.target.value) * 60 * 1000 }, lastTriggeredAt: undefined }))}>
              <option value={60}>1 jam</option>
              <option value={90}>1 jam 30 minit</option>
              <option value={120}>2 jam</option>
              <option value={180}>3 jam</option>
            </select>
          </label>}

          {reminder.schedule.kind === 'once' && <label className="field">
            <span>Tarikh & masa</span>
            <input type="datetime-local" value={toLocalInput(reminder.schedule.at)} onChange={(event) => {
              const at = new Date(event.target.value).getTime();
              if (Number.isFinite(at)) void update(reminder.id, (item) => ({ ...item, schedule: { kind: 'once', at }, lastTriggeredAt: undefined }));
            }} />
          </label>}

          <div className="reminder-next">
            <span>Seterusnya</span>
            <strong>{reminder.enabled ? formatDateTime(nextOccurrence(reminder)) : 'Dimatikan'}</strong>
          </div>
          <button className="reminder-delete" onClick={() => void remove(reminder.id)}>PADAM</button>
        </article>)}
      </div>

      <div className="ready-panel warning">
        <strong>Nota untuk versi web sekarang</strong>
        <p>TEMAN menyemak peringatan secara offline apabila aplikasi sedang dibuka. Notifikasi ketika aplikasi ditutup bergantung pada sokongan browser/peranti. Versi native Android/iPhone nanti akan menggunakan local notifications OS untuk jadual yang lebih konsisten.</p>
      </div>
    </section>
  </main>;
}
