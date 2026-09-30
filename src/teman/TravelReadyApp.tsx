import { useEffect, useMemo, useState } from 'react';
import { IndexedDbLocalStore } from '../core/storage/indexedDb';
import { prepareOfflineAppShell, runOfflineSelfTest, type OfflineSelfTest } from './offlineTest';
import { TemanRepository } from './repository';
import type { EmergencyContact, OfflineAssetState, OfflineReadiness, PilgrimProfile, TravelPlan } from './types';
import './teman-offline.css';
import './teman-travel-ready.css';

const store = new IndexedDbLocalStore();
const repo = new TemanRepository(store);
const REQUIRED_TOTAL = 8;

const blankProfile: PilgrimProfile = { id: 'primary-pilgrim', fullName: '', primaryLanguage: 'ms' };
const blankTravel: TravelPlan = {
  makkahHotel: { name: '', addressEnglish: '', addressArabic: '' },
  group: { groupCode: '', busNumber: '', mutawwifName: '', mutawwifPhone: '', meetingPoint: '', meetingPointArabic: '' },
};
const blankContact: EmergencyContact = { id: 'family-primary', name: '', relationship: '', phone: '', priority: 1 };

export default function TravelReadyApp() {
  const [profile, setProfile] = useState<PilgrimProfile>(blankProfile);
  const [travel, setTravel] = useState<TravelPlan>(blankTravel);
  const [contact, setContact] = useState<EmergencyContact>(blankContact);
  const [assets, setAssets] = useState<OfflineAssetState | undefined>();
  const [readiness, setReadiness] = useState<OfflineReadiness>({ ready: false, requiredMissing: [], optionalMissing: [] });
  const [online, setOnline] = useState(navigator.onLine);
  const [message, setMessage] = useState('');
  const [testing, setTesting] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [selfTest, setSelfTest] = useState<OfflineSelfTest | null>(null);

  const hotel = travel.makkahHotel;
  const group = travel.group;
  const completedRequired = Math.max(0, REQUIRED_TOTAL - readiness.requiredMissing.length);
  const percent = Math.round((completedRequired / REQUIRED_TOTAL) * 100);
  const reviewedIbadah = Boolean(assets?.ibadahGuide && assets.ibadahGuideVersion && assets.ibadahGuideReviewStatus === 'reviewed');

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    void refresh();
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  async function refresh() {
    const [savedProfile, savedTravel, contacts, currentAssets, currentReadiness] = await Promise.all([
      repo.getPilgrim(), repo.getTravelPlan(), repo.getEmergencyContacts(), repo.getOfflineAssets(), repo.assessOfflineReadiness(),
    ]);
    if (savedProfile) setProfile(savedProfile);
    if (savedTravel) setTravel(savedTravel);
    if (contacts[0]) setContact(contacts[0]);
    setAssets(currentAssets);
    setReadiness(currentReadiness);
  }

  async function saveFamilySetup() {
    setMessage('Menyimpan maklumat penting…');
    await repo.setPilgrim(profile);
    await repo.setTravelPlan(travel);
    await repo.setEmergencyContacts(contact.phone ? [contact] : []);
    const card = await repo.buildSafetyCard();
    await repo.updateOfflineAssets({
      emergencyPhrases: true,
      safetyCard: Boolean(card),
      travelDetails: Boolean(travel.makkahHotel?.name || travel.madinahHotel?.name),
      emergencyContacts: Boolean(contact.phone),
    });
    await refresh();
    setMessage('Maklumat keluarga disimpan pada telefon.');
  }

  async function prepareOffline() {
    setPreparing(true);
    setMessage('Menyediakan fail aplikasi untuk kegunaan offline…');
    const result = await prepareOfflineAppShell();
    if (!result.controlled) {
      setMessage('Service worker belum mengawal halaman ini. Muat semula TEMAN sekali semasa online, kemudian cuba lagi.');
    } else if (result.cached) {
      setMessage('Fail utama TEMAN sudah tersedia untuk ujian offline sebenar.');
    } else {
      setMessage('Sebahagian fail belum masuk cache. Kekal online, muat semula TEMAN dan cuba semula.');
    }
    setPreparing(false);
  }

  async function runTest() {
    setTesting(true);
    setMessage('Menjalankan ujian offline…');
    const result = await runOfflineSelfTest(store);
    setSelfTest(result);
    if (result.passedCore && result.physicallyOffline) {
      await repo.updateOfflineAssets({ offlineSelfTest: true });
      setMessage('Ujian Airplane Mode lulus. TEMAN merekodkan ujian offline semasa.');
    } else if (result.physicallyOffline) {
      await repo.updateOfflineAssets({ offlineSelfTest: false });
      setMessage('Airplane Mode dikesan, tetapi app shell belum lengkap. Kembali online dan tekan “SEDIAKAN APP OFFLINE” dahulu.');
    } else if (result.passedCore) {
      setMessage('App shell lengkap. Sekarang hidupkan Airplane Mode dan jalankan ujian sekali lagi.');
    } else {
      setMessage('Belum sedia untuk ujian akhir. Tekan “SEDIAKAN APP OFFLINE” semasa online dahulu.');
    }
    await refresh();
    setTesting(false);
  }

  const requiredRows = useMemo(() => [
    ['pilgrim-profile', 'Profil jemaah', 'Nama penuh jemaah'],
    ['hotel', 'Hotel', 'Nama hotel Makkah atau Madinah'],
    ['mutawwif-contact', 'Mutawwif', 'Nombor telefon mutawwif'],
    ['family-emergency-contact', 'Kontak keluarga', 'Nombor kecemasan keluarga'],
    ['safety-card', 'Kad keselamatan', 'Dijana daripada maklumat di atas'],
    ['emergency-phrases', 'Frasa kecemasan', 'Pek asas tersedia dalam aplikasi'],
    ['ibadah-guide', 'Panduan ibadah disemak', 'Mesti mempunyai versi + status semakan manusia'],
    ['offline-self-test', 'Ujian Airplane Mode', 'Ujian sebenar tanpa internet'],
  ] as const, [readiness]);

  return <main className="teman-app travel-ready-app">
    <header className="teman-header">
      <div><strong>TEMAN Haramain</strong><span> by <b>TGPU</b></span></div>
      <div className={online ? 'status online' : 'status offline'}>{online ? 'Online' : 'Offline • Mod ujian'}</div>
    </header>

    <section className="teman-content">
      <button className="back" onClick={() => { window.location.href = '/?app=teman'; }}>← Kembali ke TEMAN</button>

      <div className="ready-hero">
        <div className="eyebrow">Travel Ready</div>
        <h1>{readiness.ready ? 'TEMAN SUDAH SEDIA' : 'Sediakan sebelum berlepas'}</h1>
        <p>Keluarga lengkapkan sekali. Jemaah tidak perlu menaip ketika kecemasan.</p>
        <div className="ready-progress" aria-label={`${percent}% lengkap`}><div style={{ width: `${percent}%` }} /></div>
        <strong>{completedRequired}/{REQUIRED_TOTAL} perkara wajib lengkap</strong>
      </div>

      {message && <div className="saved-banner travel-message">{message}</div>}

      <section className="travel-section">
        <h2>1. Maklumat keluarga sediakan</h2>
        <p className="lead">Ini data minimum untuk bantuan asas tanpa bergantung pada internet.</p>
        <div className="ready-form-grid">
          <Field label="Nama penuh jemaah" value={profile.fullName} onChange={(value) => setProfile({ ...profile, fullName: value })} />
          <Field label="Hotel Makkah" value={hotel?.name ?? ''} onChange={(value) => setTravel({ ...travel, makkahHotel: { ...(hotel ?? { name: '' }), name: value } })} />
          <Field label="Nama mutawwif" value={group?.mutawwifName ?? ''} onChange={(value) => setTravel({ ...travel, group: { ...(group ?? {}), mutawwifName: value } })} />
          <Field label="Telefon mutawwif" value={group?.mutawwifPhone ?? ''} inputMode="tel" onChange={(value) => setTravel({ ...travel, group: { ...(group ?? {}), mutawwifPhone: value } })} />
          <Field label="Nama kontak keluarga" value={contact.name} onChange={(value) => setContact({ ...contact, name: value })} />
          <Field label="Telefon keluarga" value={contact.phone} inputMode="tel" onChange={(value) => setContact({ ...contact, phone: value })} />
        </div>
        <button className="primary big" type="button" onClick={() => void saveFamilySetup()}>SIMPAN & JANA KAD KESELAMATAN</button>
      </section>

      <section className="travel-section">
        <h2>2. Semak perkara wajib</h2>
        <div className="travel-checklist">
          {requiredRows.map(([key, label, detail]) => {
            const ok = !readiness.requiredMissing.includes(key);
            return <div className={`travel-check ${ok ? 'ok' : 'missing'}`} key={key}>
              <div className="travel-check-icon">{ok ? '✓' : '!'}</div>
              <div><strong>{label}</strong><span>{detail}</span></div>
            </div>;
          })}
        </div>
        {!reviewedIbadah && <div className="ready-panel warning integrity-note">
          <strong>Panduan ibadah belum dikira lengkap.</strong>
          <p>TEMAN belum mempunyai pek ibadah yang mempunyai versi dan status semakan manusia. Status kekal belum lengkap sehingga kandungan benar-benar disemak.</p>
        </div>}
      </section>

      <section className="travel-section">
        <h2>3. Sediakan aplikasi untuk offline</h2>
        <p className="lead">Lakukan langkah ini semasa masih mempunyai Wi‑Fi atau data.</p>
        <button className="primary big" type="button" disabled={!online || preparing} onClick={() => void prepareOffline()}>{preparing ? 'MENYEDIAKAN…' : 'SEDIAKAN APP OFFLINE'}</button>
        <button className="action big" type="button" onClick={() => { window.location.href = '/?app=teman-streets'; }}>BUKA PETA & MUAT TURUN PEK MAKKAH / MADINAH</button>
      </section>

      <section className="travel-section airplane-test">
        <h2>4. Ujian akhir: Airplane Mode</h2>
        <p className="lead">Selepas app shell dan peta disediakan, hidupkan Airplane Mode. Kemudian buka semula TEMAN dan jalankan ujian.</p>
        <button className={online ? 'warning-btn big' : 'primary big'} type="button" disabled={testing} onClick={() => void runTest()}>{testing ? 'MENGUJI…' : online ? 'UJI SEKARANG — MASIH ONLINE' : 'JALANKAN UJIAN AIRPLANE MODE'}</button>
        {selfTest && <div className={selfTest.passedCore ? 'ready-panel success' : 'ready-panel warning'}>
          <strong>{selfTest.passedCore ? 'Core offline tersedia.' : 'Core offline belum lengkap.'}</strong>
          <p>Storage {selfTest.storage ? '✓' : '✗'} • Frasa {selfTest.phrasePack ? '✓' : '✗'} • App shell {selfTest.serviceWorker ? '✓' : '✗'} • Airplane {selfTest.physicallyOffline ? '✓' : '✗'}</p>
        </div>}
      </section>

      <section className="travel-section optional-section">
        <h2>Tambahan yang sangat digalakkan</h2>
        <ReadyLine ok={!readiness.optionalMissing.includes('saved-hotel-location')} label="GPS hotel disimpan" />
        <ReadyLine ok={!readiness.optionalMissing.includes('offline-map')} label="Peta bandar disimpan offline" />
        <ReadyLine ok={!readiness.optionalMissing.includes('arabic-audio')} label="Suara Arab lokal tersedia" />
      </section>

      <div className={readiness.ready ? 'final-ready yes' : 'final-ready no'}>
        <strong>{readiness.ready ? '✓ TEMAN OFFLINE READY' : 'BELUM OFFLINE READY'}</strong>
        <span>{readiness.ready ? 'Semua syarat wajib semasa telah dipenuhi.' : 'TEMAN tidak akan menunjukkan “ready” selagi ada syarat wajib yang belum benar-benar lengkap.'}</span>
      </div>
    </section>
  </main>;
}

function Field({ label, value, onChange, inputMode }: { label: string; value: string; onChange: (value: string) => void; inputMode?: 'tel' }) {
  return <label className="field"><span>{label}</span><input inputMode={inputMode} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function ReadyLine({ ok, label }: { ok: boolean; label: string }) {
  return <div className="check-row"><span className={ok ? 'check yes' : 'check optional'}>{ok ? '✓' : '○'}</span><span>{label}</span></div>;
}
