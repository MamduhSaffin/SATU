import { FormEvent, useEffect, useMemo, useState } from 'react';
import { IndexedDbLocalStore } from '../core/storage/indexedDb';
import { EMERGENCY_PHRASES } from './emergencyPhrases';
import { TemanRepository } from './repository';
import type { EmergencyContact, OfflineReadiness, PilgrimProfile, TravelPlan } from './types';
import './teman-offline.css';

type Screen = 'home' | 'profile' | 'travel' | 'phrases' | 'card' | 'readiness';

const store = new IndexedDbLocalStore();
const repo = new TemanRepository(store);

const blankProfile: PilgrimProfile = {
  id: 'primary-pilgrim',
  fullName: '',
  primaryLanguage: 'ms',
};

const blankTravel: TravelPlan = {
  makkahHotel: { name: '', addressEnglish: '', addressArabic: '' },
  group: { groupCode: '', busNumber: '', mutawwifName: '', mutawwifPhone: '', meetingPoint: '' },
};

const blankContact: EmergencyContact = {
  id: 'family-primary',
  name: '',
  relationship: '',
  phone: '',
  priority: 1,
};

export default function TemanOfflineApp() {
  const [screen, setScreen] = useState<Screen>('home');
  const [profile, setProfile] = useState<PilgrimProfile>(blankProfile);
  const [travel, setTravel] = useState<TravelPlan>(blankTravel);
  const [contact, setContact] = useState<EmergencyContact>(blankContact);
  const [readiness, setReadiness] = useState<OfflineReadiness>({ ready: false, requiredMissing: [], optionalMissing: [] });
  const [online, setOnline] = useState(navigator.onLine);
  const [saved, setSaved] = useState(false);

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
      const [savedProfile, savedTravel, contacts] = await Promise.all([
        repo.getPilgrim(),
        repo.getTravelPlan(),
        repo.getEmergencyContacts(),
      ]);
      if (savedProfile) setProfile(savedProfile);
      if (savedTravel) setTravel(savedTravel);
      if (contacts[0]) setContact(contacts[0]);
      await repo.setOfflineAssets({
        emergencyPhrases: true,
        ibadahGuide: true,
        safetyCard: Boolean(await repo.getSafetyCard()),
        travelDetails: Boolean(savedTravel),
        emergencyContacts: contacts.length > 0,
        offlineMap: false,
        arabicAudio: false,
      });
      setReadiness(await repo.assessOfflineReadiness());
    })();
  }, []);

  const hotel = travel.makkahHotel;
  const group = travel.group;

  const safetyCard = useMemo(() => ({
    pilgrimName: profile.fullName || 'Nama jemaah belum diisi',
    hotelName: hotel?.name || 'Hotel belum diisi',
    hotelAddressArabic: hotel?.addressArabic || 'عنوان الفندق غير متوفر',
    groupCode: group?.groupCode || '—',
    busNumber: group?.busNumber || '—',
    mutawwifName: group?.mutawwifName || '—',
    mutawwifPhone: group?.mutawwifPhone || '—',
    emergencyContactPhone: contact.phone || '—',
  }), [profile, hotel, group, contact]);

  async function saveAll(event?: FormEvent) {
    event?.preventDefault();
    await repo.setPilgrim(profile);
    await repo.setTravelPlan(travel);
    await repo.setEmergencyContacts(contact.phone ? [contact] : []);
    const card = await repo.buildSafetyCard();
    await repo.setOfflineAssets({
      emergencyPhrases: true,
      ibadahGuide: true,
      safetyCard: Boolean(card),
      travelDetails: Boolean(hotel?.name || travel.madinahHotel?.name),
      emergencyContacts: Boolean(contact.phone),
      offlineMap: false,
      arabicAudio: false,
    });
    setReadiness(await repo.assessOfflineReadiness());
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  const Header = () => (
    <header className="teman-header">
      <div>
        <strong>TEMAN Haramain</strong>
        <span> by <b>TGPU</b></span>
      </div>
      <div className={online ? 'status online' : 'status offline'}>
        {online ? 'Online' : 'Offline • TEMAN masih boleh digunakan'}
      </div>
    </header>
  );

  if (screen === 'profile') {
    return <Shell header={<Header />} onBack={() => setScreen('home')}>
      <h1>Profil Jemaah</h1>
      <p className="lead">Keluarga isi sebelum berlepas. Jemaah hanya perlu guna.</p>
      <form onSubmit={saveAll} className="teman-form">
        <Field label="Nama penuh" value={profile.fullName} onChange={(value) => setProfile({ ...profile, fullName: value })} />
        <Field label="Nama panggilan" value={profile.preferredName ?? ''} onChange={(value) => setProfile({ ...profile, preferredName: value })} />
        <Field label="No. telefon Malaysia" value={profile.malaysiaPhone ?? ''} onChange={(value) => setProfile({ ...profile, malaysiaPhone: value })} />
        <Field label="No. telefon Saudi" value={profile.saudiPhone ?? ''} onChange={(value) => setProfile({ ...profile, saudiPhone: value })} />
        <Field label="Keperluan mobiliti / aksesibiliti" value={profile.accessibilityNotes ?? ''} onChange={(value) => setProfile({ ...profile, accessibilityNotes: value })} />
        <button className="primary big" type="submit">SIMPAN OFFLINE</button>
      </form>
    </Shell>;
  }

  if (screen === 'travel') {
    return <Shell header={<Header />} onBack={() => setScreen('home')}>
      <h1>Hotel & Kumpulan</h1>
      <p className="lead">Maklumat ini disimpan pada telefon dan boleh dibuka tanpa internet.</p>
      <form onSubmit={saveAll} className="teman-form">
        <Field label="Hotel Makkah" value={hotel?.name ?? ''} onChange={(value) => setTravel({ ...travel, makkahHotel: { ...hotel, name: value } })} />
        <Field label="Alamat hotel (English)" value={hotel?.addressEnglish ?? ''} onChange={(value) => setTravel({ ...travel, makkahHotel: { ...hotel, name: hotel?.name ?? '', addressEnglish: value } })} />
        <Field label="Alamat hotel (Arabic)" value={hotel?.addressArabic ?? ''} dir="rtl" onChange={(value) => setTravel({ ...travel, makkahHotel: { ...hotel, name: hotel?.name ?? '', addressArabic: value } })} />
        <Field label="Kod kumpulan" value={group?.groupCode ?? ''} onChange={(value) => setTravel({ ...travel, group: { ...group, groupCode: value } })} />
        <Field label="Nombor bas" value={group?.busNumber ?? ''} onChange={(value) => setTravel({ ...travel, group: { ...group, busNumber: value } })} />
        <Field label="Nama mutawwif" value={group?.mutawwifName ?? ''} onChange={(value) => setTravel({ ...travel, group: { ...group, mutawwifName: value } })} />
        <Field label="Telefon mutawwif" value={group?.mutawwifPhone ?? ''} onChange={(value) => setTravel({ ...travel, group: { ...group, mutawwifPhone: value } })} />
        <Field label="Tempat berkumpul" value={group?.meetingPoint ?? ''} onChange={(value) => setTravel({ ...travel, group: { ...group, meetingPoint: value } })} />
        <h2>Kontak keluarga</h2>
        <Field label="Nama" value={contact.name} onChange={(value) => setContact({ ...contact, name: value })} />
        <Field label="Hubungan" value={contact.relationship ?? ''} onChange={(value) => setContact({ ...contact, relationship: value })} />
        <Field label="Telefon" value={contact.phone} onChange={(value) => setContact({ ...contact, phone: value })} />
        <button className="primary big" type="submit">SIMPAN OFFLINE</button>
      </form>
    </Shell>;
  }

  if (screen === 'phrases') {
    return <Shell header={<Header />} onBack={() => setScreen('home')}>
      <h1>Cakap Untuk Saya</h1>
      <p className="lead">Frasa penting ini tersedia tanpa internet.</p>
      <div className="phrase-list">
        {EMERGENCY_PHRASES.map((phrase) => <article className="phrase-card" key={phrase.id}>
          <div className="phrase-ms">{phrase.ms}</div>
          <div className="phrase-ar" dir="rtl">{phrase.ar}</div>
          <div className="phrase-en">{phrase.en}</div>
          <small>Prototype • Arabic awaiting final human review</small>
        </article>)}
      </div>
    </Shell>;
  }

  if (screen === 'card') {
    return <Shell header={<Header />} onBack={() => setScreen('home')}>
      <h1>Kad Keselamatan</h1>
      <div className="safety-card">
        <div className="flag">MALAYSIA</div>
        <h2>{safetyCard.pilgrimName}</h2>
        <p className="arabic-help" dir="rtl">أنا حاج من ماليزيا وقد انفصلت عن مجموعتي. الرجاء مساعدتي.</p>
        <Info label="HOTEL" value={safetyCard.hotelName} />
        <Info label="العنوان" value={safetyCard.hotelAddressArabic} rtl />
        <Info label="GROUP / BUS" value={`${safetyCard.groupCode} • ${safetyCard.busNumber}`} />
        <Info label="MUTAWWIF" value={`${safetyCard.mutawwifName} • ${safetyCard.mutawwifPhone}`} />
        <Info label="FAMILY" value={safetyCard.emergencyContactPhone} />
      </div>
      <button className="primary big" onClick={() => void saveAll()}>SIMPAN KAD OFFLINE</button>
    </Shell>;
  }

  if (screen === 'readiness') {
    return <Shell header={<Header />} onBack={() => setScreen('home')}>
      <h1>{readiness.ready ? 'TEMAN OFFLINE READY' : 'Belum Sedia Offline'}</h1>
      <div className={readiness.ready ? 'ready-panel success' : 'ready-panel warning'}>
        <strong>{readiness.ready ? 'Fungsi penting boleh digunakan tanpa internet.' : 'Lengkapkan perkara berikut sebelum berlepas.'}</strong>
      </div>
      <Checklist label="Profil jemaah" ok={!readiness.requiredMissing.includes('pilgrim-profile')} />
      <Checklist label="Hotel" ok={!readiness.requiredMissing.includes('hotel')} />
      <Checklist label="Telefon mutawwif" ok={!readiness.requiredMissing.includes('mutawwif-contact')} />
      <Checklist label="Kontak keluarga" ok={!readiness.requiredMissing.includes('family-emergency-contact')} />
      <Checklist label="Kad keselamatan" ok={!readiness.requiredMissing.includes('safety-card')} />
      <Checklist label="Frasa kecemasan" ok={!readiness.requiredMissing.includes('emergency-phrases')} />
      <Checklist label="Panduan ibadah" ok={!readiness.requiredMissing.includes('ibadah-guide')} />
      <Checklist label="Peta offline (pilihan)" ok={!readiness.optionalMissing.includes('offline-map')} optional />
      <Checklist label="Audio Arab (pilihan)" ok={!readiness.optionalMissing.includes('arabic-audio')} optional />
      <button className="primary big" onClick={() => void saveAll()}>SEMAK SEMULA</button>
    </Shell>;
  }

  return <Shell header={<Header />}>
    <div className="hero">
      <div className="eyebrow">Senior Safety Mode</div>
      <h1>Apa yang anda perlukan?</h1>
      <p>Tekan satu butang sahaja. Maklumat penting disimpan pada telefon.</p>
    </div>
    {!online && <div className="offline-banner">OFFLINE • TEMAN masih berfungsi</div>}
    {saved && <div className="saved-banner">Disimpan pada telefon</div>}
    <button className="danger huge" onClick={() => setScreen('phrases')}>
      BANTU SAYA SEKARANG
      <span>Sesat, sakit, terpisah atau perlukan bantuan</span>
    </button>
    <button className="action huge" onClick={() => setScreen('card')}>
      BALIK KE HOTEL
      <span>Tunjuk kad hotel dan maklumat kumpulan</span>
    </button>
    <button className="action huge" onClick={() => setScreen('phrases')}>
      CAKAP & TERJEMAH
      <span>BM • العربية • English</span>
    </button>
    <button className="action huge" onClick={() => setScreen('profile')}>
      PROFIL JEMAAH
      <span>Disediakan oleh keluarga sebelum perjalanan</span>
    </button>
    <button className="action huge" onClick={() => setScreen('travel')}>
      HOTEL & KUMPULAN
      <span>Hotel, bas, mutawwif dan kontak keluarga</span>
    </button>
    <button className={readiness.ready ? 'ready huge' : 'warning-btn huge'} onClick={() => setScreen('readiness')}>
      {readiness.ready ? 'OFFLINE READY' : 'SEMAK OFFLINE'}
      <span>{readiness.ready ? 'Fungsi penting sudah tersedia' : 'Pastikan semua maklumat penting sudah disimpan'}</span>
    </button>
  </Shell>;
}

function Shell({ header, children, onBack }: { header: React.ReactNode; children: React.ReactNode; onBack?: () => void }) {
  return <main className="teman-app">
    {header}
    {onBack && <button className="back" onClick={onBack}>← Kembali</button>}
    <section className="teman-content">{children}</section>
  </main>;
}

function Field({ label, value, onChange, dir }: { label: string; value: string; onChange: (value: string) => void; dir?: 'rtl' | 'ltr' }) {
  return <label className="field">
    <span>{label}</span>
    <input dir={dir} value={value} onChange={(event) => onChange(event.target.value)} />
  </label>;
}

function Info({ label, value, rtl }: { label: string; value: string; rtl?: boolean }) {
  return <div className="info-row">
    <span>{label}</span>
    <strong dir={rtl ? 'rtl' : undefined}>{value}</strong>
  </div>;
}

function Checklist({ label, ok, optional }: { label: string; ok: boolean; optional?: boolean }) {
  return <div className="check-row">
    <span className={ok ? 'check yes' : optional ? 'check optional' : 'check no'}>{ok ? '✓' : optional ? '○' : '!'}</span>
    <span>{label}</span>
  </div>;
}
