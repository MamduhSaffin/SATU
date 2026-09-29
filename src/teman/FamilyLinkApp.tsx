import { useEffect, useMemo, useState } from 'react';
import { IndexedDbLocalStore } from '../core/storage/indexedDb';
import { OfflineSyncQueue } from '../core/sync/queue';
import { TemanRepository } from './repository';
import type { EmergencyContact, PilgrimProfile, TravelPlan } from './types';
import './teman-offline.css';

type CheckInStatus = 'safe' | 'with-group' | 'at-hotel' | 'need-contact';

type FamilyCheckIn = {
  id: string;
  status: CheckInStatus;
  label: string;
  createdAt: number;
  pilgrimName: string;
  hotelName?: string;
  groupCode?: string;
  busNumber?: string;
};

const CHECKIN_KEY = 'teman.family.checkins';
const store = new IndexedDbLocalStore();
const repo = new TemanRepository(store);
const syncQueue = new OfflineSyncQueue(store);

const STATUS_LABELS: Record<CheckInStatus, string> = {
  safe: 'Saya selamat',
  'with-group': 'Saya bersama kumpulan',
  'at-hotel': 'Saya sudah di hotel',
  'need-contact': 'Tolong hubungi saya',
};

function formatTime(value: number): string {
  return new Date(value).toLocaleString('ms-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function FamilyLinkApp() {
  const [profile, setProfile] = useState<PilgrimProfile | undefined>();
  const [travel, setTravel] = useState<TravelPlan | undefined>();
  const [contact, setContact] = useState<EmergencyContact | undefined>();
  const [checkIns, setCheckIns] = useState<FamilyCheckIn[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);
  const [message, setMessage] = useState('');

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
    void (async () => {
      const [savedProfile, savedTravel, contacts, savedCheckIns, queue] = await Promise.all([
        repo.getPilgrim(),
        repo.getTravelPlan(),
        repo.getEmergencyContacts(),
        store.get<FamilyCheckIn[]>(CHECKIN_KEY),
        syncQueue.list(),
      ]);
      setProfile(savedProfile);
      setTravel(savedTravel);
      setContact(contacts[0]);
      setCheckIns(savedCheckIns ?? []);
      setPendingCount(queue.filter((item) => item.channel === 'teman.family-checkin').length);
    })();
  }, []);

  const latest = checkIns[0];
  const hotel = travel?.makkahHotel ?? travel?.madinahHotel;
  const group = travel?.group;

  const familyPreview = useMemo(() => ({
    pilgrimName: latest?.pilgrimName || profile?.fullName || 'Nama jemaah',
    status: latest?.label || 'Belum ada check-in',
    time: latest ? formatTime(latest.createdAt) : '—',
    hotel: latest?.hotelName || hotel?.name || '—',
    group: latest?.groupCode || group?.groupCode || '—',
    bus: latest?.busNumber || group?.busNumber || '—',
  }), [latest, profile, hotel, group]);

  async function saveCheckIn(status: CheckInStatus) {
    const item: FamilyCheckIn = {
      id: `checkin-${Date.now()}`,
      status,
      label: STATUS_LABELS[status],
      createdAt: Date.now(),
      pilgrimName: profile?.fullName || 'Jemaah TEMAN',
      hotelName: hotel?.name,
      groupCode: group?.groupCode,
      busNumber: group?.busNumber,
    };
    const next = [item, ...checkIns].slice(0, 20);
    await store.set(CHECKIN_KEY, next);
    await syncQueue.enqueue('teman.family-checkin', 'create', item);
    setCheckIns(next);
    const queue = await syncQueue.list();
    setPendingCount(queue.filter((entry) => entry.channel === 'teman.family-checkin').length);
    setMessage(
      online
        ? 'Check-in disimpan. Family cloud sync belum disambungkan; kongsi status ini secara manual buat masa sekarang.'
        : 'Check-in disimpan offline dan dimasukkan ke queue. Ia boleh diselaraskan apabila Family cloud sync disambungkan nanti.',
    );
  }

  async function shareLatest() {
    if (!latest) {
      setMessage('Buat satu check-in dahulu.');
      return;
    }
    const text = [
      `TEMAN Family Link — ${latest.pilgrimName}`,
      `Status: ${latest.label}`,
      `Masa: ${formatTime(latest.createdAt)}`,
      latest.hotelName ? `Hotel: ${latest.hotelName}` : '',
      latest.groupCode ? `Kumpulan: ${latest.groupCode}` : '',
      latest.busNumber ? `Bas: ${latest.busNumber}` : '',
      'Dihantar melalui TEMAN Haramain by TGPU.',
    ].filter(Boolean).join('\n');

    try {
      if (navigator.share) {
        await navigator.share({ title: 'TEMAN Family Link', text });
        setMessage('Status sedia untuk dikongsi kepada keluarga.');
      } else {
        await navigator.clipboard.writeText(text);
        setMessage('Status disalin. Tampal ke WhatsApp atau SMS keluarga.');
      }
    } catch {
      setMessage('Perkongsian dibatalkan. Check-in masih selamat tersimpan pada telefon.');
    }
  }

  function callFamily() {
    if (!contact?.phone) {
      setMessage('Nombor keluarga belum disimpan dalam TEMAN.');
      return;
    }
    const cleaned = contact.phone.replace(/[^\d+]/g, '');
    if (cleaned) window.location.href = `tel:${cleaned}`;
  }

  return <main className="teman-app">
    <header className="teman-header">
      <div>
        <strong>TEMAN Family Link</strong>
        <span> by <b>TGPU</b></span>
      </div>
      <div className={online ? 'status online' : 'status offline'}>
        {online ? 'Online' : 'Offline • check-in masih boleh disimpan'}
      </div>
    </header>

    <button className="back" onClick={() => { window.location.href = '/?app=teman'; }}>← Kembali ke TEMAN</button>

    <section className="teman-content">
      <div className="hero">
        <div className="eyebrow">Privacy-first Family Link</div>
        <h1>Beritahu keluarga dengan satu tekan.</h1>
        <p>Jemaah memilih sendiri apa yang hendak dikongsi. Live tracking kekal OFF secara lalai.</p>
      </div>

      {!online && <div className="offline-banner">OFFLINE • Check-in akan disimpan pada telefon</div>}
      {message && <div className="saved-banner">{message}</div>}

      <button className="primary huge" onClick={() => void saveCheckIn('safe')}>
        SAYA SELAMAT
        <span>Simpan check-in keselamatan sekarang</span>
      </button>
      <button className="action huge" onClick={() => void saveCheckIn('with-group')}>
        SAYA BERSAMA KUMPULAN
        <span>Simpan status bersama kumpulan</span>
      </button>
      <button className="action huge" onClick={() => void saveCheckIn('at-hotel')}>
        SAYA SUDAH DI HOTEL
        <span>Simpan status sudah kembali ke hotel</span>
      </button>
      <button className="warning-btn huge" onClick={() => void saveCheckIn('need-contact')}>
        TOLONG HUBUNGI SAYA
        <span>Simpan permintaan supaya keluarga menghubungi anda</span>
      </button>

      <h2>Status Terakhir</h2>
      <div className="safety-card">
        <Info label="JEMAAH" value={familyPreview.pilgrimName} />
        <Info label="STATUS" value={familyPreview.status} />
        <Info label="MASA" value={familyPreview.time} />
        <Info label="HOTEL" value={familyPreview.hotel} />
        <Info label="KUMPULAN / BAS" value={`${familyPreview.group} • ${familyPreview.bus}`} />
      </div>

      <button className="primary big" onClick={() => void shareLatest()}>KONGSI STATUS KEPADA KELUARGA</button>
      {contact?.phone && <button className="action big" onClick={callFamily}>TELEFON {contact.name || 'KELUARGA'}</button>}

      <div className="ready-panel success">
        <strong>Privasi</strong>
        <p>Live location: OFF. TEMAN tidak menghantar lokasi berterusan dalam versi ini. Check-in dibuat hanya apabila jemaah menekan butang.</p>
      </div>

      <div className="ready-panel warning">
        <strong>Family cloud sync — belum aktif</strong>
        <p>{pendingCount} check-in menunggu dalam sync queue tempatan. Infrastruktur queue sudah tersedia, tetapi endpoint Azure keluarga belum disambungkan dalam v0.5.</p>
      </div>
    </section>
  </main>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="info-row">
    <span>{label}</span>
    <strong>{value}</strong>
  </div>;
}
