import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { IndexedDbLocalStore } from '../core/storage/indexedDb';
import { speakArabic } from './audio';
import { EMERGENCY_PHRASES } from './emergencyPhrases';
import { runOfflineSelfTest, type OfflineSelfTest } from './offlineTest';
import { TemanRepository } from './repository';
import type { EmergencyContact, OfflineReadiness, PilgrimProfile, SavedLocation, TravelPlan } from './types';
import './teman-offline.css';

type Screen = 'home' | 'profile' | 'travel' | 'phrases' | 'card' | 'readiness' | 'location';

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
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [online, setOnline] = useState(navigator.onLine);
  const [saved, setSaved] = useState(false);
  const [audioMessage, setAudioMessage] = useState('');
  const [locationMessage, setLocationMessage] = useState('');
  const [selfTest, setSelfTest] = useState<OfflineSelfTest | null>(null);
  const [testing, setTesting] = useState(false);

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
      const [savedProfile, savedTravel, contacts, locations, card] = await Promise.all([
        repo.getPilgrim(),
        repo.getTravelPlan(),
        repo.getEmergencyContacts(),
        repo.getSavedLocations(),
        repo.getSafetyCard(),
      ]);
      if (savedProfile) setProfile(savedProfile);
      if (savedTravel) setTravel(savedTravel);
      if (contacts[0]) setContact(contacts[0]);
      setSavedLocations(locations);
      await repo.updateOfflineAssets({
        emergencyPhrases: true,
        ibadahGuide: true,
        safetyCard: Boolean(card),
        travelDetails: Boolean(savedTravel?.makkahHotel?.name || savedTravel?.madinahHotel?.name),
        emergencyContacts: contacts.length > 0,
        savedHotelLocation: locations.some((item) => item.id === 'hotel-makkah' || item.id === 'hotel-madinah'),
      });
      setReadiness(await repo.assessOfflineReadiness());
    })();
  }, []);

  const hotel = travel.makkahHotel;
  const group = travel.group;
  const hotelLocation = savedLocations.find((item) => item.id === 'hotel-makkah') ?? savedLocations.find((item) => item.id === 'hotel-madinah');

  const safetyCard = useMemo(() => ({
    pilgrimName: profile.fullName || 'Nama jemaah belum diisi',
    hotelName: hotel?.name || 'Hotel belum diisi',
    hotelAddressArabic: hotel?.addressArabic || 'عنوان الفندق غير متوفر',
    hotelLatitude: hotel?.latitude ?? hotelLocation?.latitude,
    hotelLongitude: hotel?.longitude ?? hotelLocation?.longitude,
    groupCode: group?.groupCode || '—',
    busNumber: group?.busNumber || '—',
    mutawwifName: group?.mutawwifName || '—',
    mutawwifPhone: group?.mutawwifPhone || '—',
    emergencyContactPhone: contact.phone || '—',
  }), [profile, hotel, hotelLocation, group, contact]);

  async function refreshReadiness() {
    setReadiness(await repo.assessOfflineReadiness());
  }

  async function saveAll(event?: FormEvent) {
    event?.preventDefault();
    await repo.setPilgrim(profile);
    await repo.setTravelPlan(travel);
    await repo.setEmergencyContacts(contact.phone ? [contact] : []);
    const card = await repo.buildSafetyCard();
    await repo.updateOfflineAssets({
      emergencyPhrases: true,
      ibadahGuide: true,
      safetyCard: Boolean(card),
      travelDetails: Boolean(hotel?.name || travel.madinahHotel?.name),
      emergencyContacts: Boolean(contact.phone),
    });
    await refreshReadiness();
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  async function playArabic(text: string) {
    setAudioMessage('Memeriksa suara Arab pada telefon…');
    const result = await speakArabic(text);
    if (!result.played) {
      setAudioMessage('Suara Arab tidak tersedia pada peranti ini. Tunjukkan teks Arab pada skrin.');
      return;
    }
    if (result.offlineCapable) {
      await repo.updateOfflineAssets({ arabicAudio: true });
      await refreshReadiness();
      setAudioMessage('Audio Arab dimainkan menggunakan suara tempatan peranti — boleh digunakan tanpa internet.');
    } else {
      setAudioMessage('Audio dimainkan, tetapi suara ini mungkin memerlukan internet. Teks Arab tetap tersedia offline.');
    }
  }

  function captureHotelLocation() {
    if (!('geolocation' in navigator)) {
      setLocationMessage('GPS tidak tersedia pada peranti ini. Masukkan koordinat secara manual.');
      return;
    }
    setLocationMessage('Mencari lokasi GPS…');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void (async () => {
          const location: SavedLocation = {
            id: 'hotel-makkah',
            label: hotel?.name || 'Hotel Makkah',
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyMeters: position.coords.accuracy,
            capturedAt: Date.now(),
          };
          await repo.setSavedLocation(location);
          const nextTravel: TravelPlan = {
            ...travel,
            makkahHotel: {
              ...(hotel ?? { name: 'Hotel Makkah' }),
              name: hotel?.name || 'Hotel Makkah',
              latitude: location.latitude,
              longitude: location.longitude,
            },
          };
          setTravel(nextTravel);
          await repo.setTravelPlan(nextTravel);
          const locations = await repo.getSavedLocations();
          setSavedLocations(locations);
          await repo.buildSafetyCard();
          await repo.updateOfflineAssets({ savedHotelLocation: true, safetyCard: true, travelDetails: true });
          await refreshReadiness();
          setLocationMessage(`Lokasi hotel disimpan offline. Ketepatan ±${Math.round(position.coords.accuracy)} m.`);
        })();
      },
      (error) => setLocationMessage(`Tidak dapat mendapatkan GPS: ${error.message}`),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }

  async function saveManualCoordinates() {
    const lat = hotel?.latitude;
    const lng = hotel?.longitude;
    if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
      setLocationMessage('Masukkan latitude dan longitude yang sah dahulu.');
      return;
    }
    const location: SavedLocation = {
      id: 'hotel-makkah',
      label: hotel?.name || 'Hotel Makkah',
      latitude: lat,
      longitude: lng,
      capturedAt: Date.now(),
    };
    await repo.setSavedLocation(location);
    setSavedLocations(await repo.getSavedLocations());
    await repo.setTravelPlan(travel);
    await repo.buildSafetyCard();
    await repo.updateOfflineAssets({ savedHotelLocation: true, safetyCard: true, travelDetails: true });
    await refreshReadiness();
    setLocationMessage('Koordinat hotel disimpan offline.');
  }

  async function copyCoordinates() {
    const lat = safetyCard.hotelLatitude;
    const lng = safetyCard.hotelLongitude;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      setLocationMessage('Koordinat hotel belum disimpan.');
      return;
    }
    const value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    try {
      await navigator.clipboard.writeText(value);
      setLocationMessage(`Koordinat disalin: ${value}`);
    } catch {
      setLocationMessage(`Koordinat hotel: ${value}`);
    }
  }

  async function runTravelOfflineTest() {
    setTesting(true);
    const result = await runOfflineSelfTest(store);
    setSelfTest(result);
    if (result.passedCore && result.physicallyOffline) {
      await repo.updateOfflineAssets({ offlineSelfTest: true, arabicAudio: result.arabicLocalVoice || undefined });
    }
    await refreshReadiness();
    setTesting(false);
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
        <Field label="Hotel latitude (contoh 21.4225)" value={hotel?.latitude?.toString() ?? ''} onChange={(value) => setTravel({ ...travel, makkahHotel: { ...hotel, name: hotel?.name ?? '', latitude: value ? Number(value) : undefined } })} />
        <Field label="Hotel longitude (contoh 39.8262)" value={hotel?.longitude?.toString() ?? ''} onChange={(value) => setTravel({ ...travel, makkahHotel: { ...hotel, name: hotel?.name ?? '', longitude: value ? Number(value) : undefined } })} />
        <button className="action big" type="button" onClick={() => void saveManualCoordinates()}>SIMPAN KOORDINAT HOTEL</button>
        <button className="action big" type="button" onClick={captureHotelLocation}>GUNA GPS SEMASA DI HOTEL</button>
        {locationMessage && <div className="saved-banner">{locationMessage}</div>}
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
      <p className="lead">Frasa penting tersedia tanpa internet. Audio offline bergantung pada suara Arab tempatan yang dipasang pada telefon.</p>
      {audioMessage && <div className="saved-banner">{audioMessage}</div>}
      <div className="phrase-list">
        {EMERGENCY_PHRASES.map((phrase) => <article className="phrase-card" key={phrase.id}>
          <div className="phrase-ms">{phrase.ms}</div>
          <div className="phrase-ar" dir="rtl">{phrase.ar}</div>
          <div className="phrase-en">{phrase.en}</div>
          <button className="primary big" type="button" onClick={() => void playArabic(phrase.ar)}>MAIN AUDIO ARAB</button>
          <small>Prototype • Arabic awaiting final human review</small>
        </article>)}
      </div>
    </Shell>;
  }

  if (screen === 'location') {
    const lat = safetyCard.hotelLatitude;
    const lng = safetyCard.hotelLongitude;
    return <Shell header={<Header />} onBack={() => setScreen('home')}>
      <h1>Lokasi Hotel Offline</h1>
      <p className="lead">Simpan koordinat sebelum diperlukan. GPS boleh menentukan kedudukan tanpa data mudah alih, tetapi peta latar memerlukan peta yang telah dimuat turun.</p>
      <div className="safety-card">
        <Info label="HOTEL" value={safetyCard.hotelName} />
        <Info label="العنوان" value={safetyCard.hotelAddressArabic} rtl />
        <Info label="LATITUDE" value={typeof lat === 'number' ? lat.toFixed(6) : 'Belum disimpan'} />
        <Info label="LONGITUDE" value={typeof lng === 'number' ? lng.toFixed(6) : 'Belum disimpan'} />
      </div>
      <button className="primary big" onClick={() => void copyCoordinates()}>SALIN KOORDINAT</button>
      <button className="action big" onClick={captureHotelLocation}>KEMAS KINI GPS SEMASA DI HOTEL</button>
      {locationMessage && <div className="saved-banner">{locationMessage}</div>}
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
        {typeof safetyCard.hotelLatitude === 'number' && typeof safetyCard.hotelLongitude === 'number' &&
          <Info label="GPS" value={`${safetyCard.hotelLatitude.toFixed(6)}, ${safetyCard.hotelLongitude.toFixed(6)}`} />}
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
      <Checklist label="Ujian offline sebenar" ok={!readiness.requiredMissing.includes('offline-self-test')} />
      <Checklist label="Lokasi hotel disimpan (pilihan)" ok={!readiness.optionalMissing.includes('saved-hotel-location')} optional />
      <Checklist label="Peta offline (pilihan)" ok={!readiness.optionalMissing.includes('offline-map')} optional />
      <Checklist label="Audio Arab tempatan (pilihan)" ok={!readiness.optionalMissing.includes('arabic-audio')} optional />

      <button className="primary big" type="button" onClick={() => void runTravelOfflineTest()} disabled={testing}>
        {testing ? 'MENGUJI…' : 'JALANKAN UJIAN OFFLINE'}
      </button>
      {selfTest && <div className={selfTest.passedCore ? 'ready-panel success' : 'ready-panel warning'}>
        <strong>{selfTest.passedCore ? 'Core offline test lulus.' : 'Core offline test belum lulus.'}</strong>
        <p>Storage: {selfTest.storage ? '✓' : '✗'} • Phrase pack: {selfTest.phrasePack ? '✓' : '✗'} • App cache: {selfTest.serviceWorker ? '✓' : '✗'}</p>
        <p>Arabic local voice: {selfTest.arabicLocalVoice ? '✓' : 'optional / unavailable'}</p>
        <p>{selfTest.physicallyOffline ? 'Airplane/offline mode detected — final offline test completed.' : 'Untuk final Travel Ready: hidupkan Airplane Mode, kemudian jalankan ujian ini sekali lagi.'}</p>
      </div>}
      <button className="action big" onClick={() => void saveAll()}>SEMAK SEMULA DATA</button>
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
    <button className="action huge" onClick={() => setScreen('location')}>
      LOKASI HOTEL OFFLINE
      <span>Alamat dan koordinat yang sudah disimpan</span>
    </button>
    <button className="action huge" onClick={() => setScreen('phrases')}>
      CAKAP & TERJEMAH
      <span>BM • العربية • English + audio jika tersedia</span>
    </button>
    <button className="action huge" onClick={() => setScreen('profile')}>
      PROFIL JEMAAH
      <span>Disediakan oleh keluarga sebelum perjalanan</span>
    </button>
    <button className="action huge" onClick={() => setScreen('travel')}>
      HOTEL & KUMPULAN
      <span>Hotel, GPS, bas, mutawwif dan kontak keluarga</span>
    </button>
    <button className={readiness.ready ? 'ready huge' : 'warning-btn huge'} onClick={() => setScreen('readiness')}>
      {readiness.ready ? 'OFFLINE READY' : 'SEMAK OFFLINE'}
      <span>{readiness.ready ? 'Ujian offline sebenar sudah selesai' : 'Lengkapkan data dan uji dalam Airplane Mode'}</span>
    </button>
  </Shell>;
}

function Shell({ header, children, onBack }: { header: ReactNode; children: ReactNode; onBack?: () => void }) {
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
