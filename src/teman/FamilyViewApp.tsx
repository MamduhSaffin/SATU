import { useCallback, useEffect, useState } from 'react';
import './teman-offline.css';

type FamilyStatus = {
  id: string;
  status: string;
  label: string;
  createdAt: number;
  pilgrimName: string;
  hotelName?: string;
  groupCode?: string;
  busNumber?: string;
};

function formatTime(value: number): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('ms-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function FamilyViewApp() {
  const params = new URLSearchParams(window.location.search);
  const familyId = params.get('family') || '';
  const token = params.get('token') || '';
  const [latest, setLatest] = useState<FamilyStatus | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [message, setMessage] = useState('Memuat status keluarga…');
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (!familyId || !token) {
      setMessage('Pautan Family Link tidak lengkap. Minta jemaah kongsi pautan baharu.');
      return;
    }
    if (!navigator.onLine) {
      setMessage('Peranti keluarga sedang offline. Status terakhir di bawah tidak dapat dikemas kini sehingga internet kembali.');
      return;
    }
    setRefreshing(true);
    try {
      const response = await fetch(`/api/family/status?family=${encodeURIComponent(familyId)}&token=${encodeURIComponent(token)}`, { cache: 'no-store' });
      const body = await response.json() as { ok?: boolean; latest?: FamilyStatus | null; configurationRequired?: boolean; message?: string };
      if (!response.ok) {
        setMessage(body.configurationRequired ? 'Family cloud belum dikonfigurasi pada Azure.' : (body.message || 'Tidak dapat mendapatkan status Family Link.'));
        return;
      }
      setLatest(body.latest ?? null);
      setMessage(body.latest ? 'Status dikemas kini daripada TEMAN.' : 'Belum ada check-in daripada jemaah.');
    } catch {
      setMessage('Tidak dapat menghubungi TEMAN cloud. Cuba semula sebentar lagi.');
    } finally {
      setRefreshing(false);
    }
  }, [familyId, token]);

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
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  return <main className="teman-app">
    <header className="teman-header">
      <div>
        <strong>TEMAN Family View</strong>
        <span> by <b>TGPU</b></span>
      </div>
      <div className={online ? 'status online' : 'status offline'}>{online ? 'Online' : 'Offline'}</div>
    </header>

    <section className="teman-content">
      <div className="hero">
        <div className="eyebrow">Untuk keluarga</div>
        <h1>Status jemaah.</h1>
        <p>Halaman ini hanya menunjukkan check-in yang jemaah pilih sendiri. Live tracking tidak digunakan.</p>
      </div>

      {message && <div className="saved-banner">{message}</div>}

      <div className="safety-card">
        <Info label="JEMAAH" value={latest?.pilgrimName || '—'} />
        <Info label="STATUS" value={latest?.label || 'Belum ada check-in'} />
        <Info label="MASA" value={latest ? formatTime(latest.createdAt) : '—'} />
        <Info label="HOTEL" value={latest?.hotelName || '—'} />
        <Info label="KUMPULAN / BAS" value={latest ? `${latest.groupCode || '—'} • ${latest.busNumber || '—'}` : '—'} />
      </div>

      <button className="primary big" disabled={refreshing || !online} onClick={() => void refresh()}>
        {refreshing ? 'MENGEMAS KINI…' : 'KEMAS KINI STATUS'}
      </button>

      <div className="ready-panel success">
        <strong>Privasi</strong>
        <p>TEMAN hanya memaparkan check-in yang dihantar oleh jemaah. Tiada lokasi GPS berterusan dipaparkan pada halaman ini.</p>
      </div>
    </section>
  </main>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="info-row"><span>{label}</span><strong>{value}</strong></div>;
}
