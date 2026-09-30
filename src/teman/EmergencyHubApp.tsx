import { useEffect, useState } from 'react';
import { IndexedDbLocalStore } from '../core/storage/indexedDb';
import { findEmergencyPhrase } from './emergencyPhrases';
import { TemanRepository } from './repository';
import type { EmergencyContact, SafetyCardData, TravelPlan } from './types';
import './teman-offline.css';
import './teman-emergency.css';

type EmergencyView = 'home' | 'lost' | 'hotel' | 'bus' | 'medical' | 'card';

const store = new IndexedDbLocalStore();
const repo = new TemanRepository(store);

const OFFICIAL_NUMBERS = {
  ambulance: '997',
  unifiedEmergency: '911',
  healthAdvice: '937',
} as const;

export default function EmergencyHubApp() {
  const [view, setView] = useState<EmergencyView>('home');
  const [travel, setTravel] = useState<TravelPlan | undefined>();
  const [contact, setContact] = useState<EmergencyContact | undefined>();
  const [card, setCard] = useState<SafetyCardData | undefined>();
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    void (async () => {
      const [savedTravel, contacts, savedCard] = await Promise.all([
        repo.getTravelPlan(), repo.getEmergencyContacts(), repo.getSafetyCard(),
      ]);
      setTravel(savedTravel);
      setContact(contacts[0]);
      setCard(savedCard ?? await repo.buildSafetyCard());
    })();
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  const mutawwifPhone = travel?.group?.mutawwifPhone;

  function callNumber(phone?: string) {
    if (!phone) return;
    const cleaned = phone.replace(/[^\d+]/g, '');
    if (cleaned) window.location.href = `tel:${cleaned}`;
  }

  function openMap(target: 'hotel' | 'group') {
    window.location.href = `/?app=teman-streets&target=${target}`;
  }

  if (view === 'card') {
    return <Shell online={online} onBack={() => setView('home')}>
      <h1>Kad Keselamatan</h1>
      <p className="emergency-lead">Tunjukkan skrin ini kepada petugas, pemandu atau orang yang membantu.</p>
      <SafetyCard card={card} />
      <button className="emergency-primary" onClick={() => openMap('hotel')}>PETA KE HOTEL</button>
      {mutawwifPhone && <button className="emergency-secondary" onClick={() => callNumber(mutawwifPhone)}>HUBUNGI MUTAWWIF</button>}
      {contact?.phone && <button className="emergency-secondary" onClick={() => callNumber(contact.phone)}>HUBUNGI KELUARGA</button>}
    </Shell>;
  }

  if (view !== 'home') {
    const phraseId = view === 'lost'
      ? 'lost-group'
      : view === 'hotel'
        ? 'return-hotel'
        : view === 'bus'
          ? 'cannot-find-bus'
          : 'need-medical-help';
    const phrase = findEmergencyPhrase(phraseId);

    return <Shell online={online} onBack={() => setView('home')}>
      <h1>{view === 'medical' ? 'Saya Tak Sihat' : view === 'hotel' ? 'Balik Ke Hotel' : view === 'bus' ? 'Cari Bas / Kumpulan' : 'Saya Sesat / Terpisah'}</h1>
      {phrase && <div className="emergency-phrase-card">
        <div className="emergency-arabic" dir="rtl">{phrase.ar}</div>
        <strong>{phrase.ms}</strong>
        <span>{phrase.en}</span>
        <small>Draf prototaip • Bahasa Arab menunggu semakan manusia akhir</small>
      </div>}

      {view === 'medical' ? <>
        <button className="emergency-danger" onClick={() => callNumber(OFFICIAL_NUMBERS.ambulance)}>AMBULANS 997<span>Kecemasan perubatan</span></button>
        <button className="emergency-danger" onClick={() => callNumber(OFFICIAL_NUMBERS.unifiedEmergency)}>KECEMASAN 911<span>Nombor kecemasan bersepadu Saudi</span></button>
        <button className="emergency-primary" onClick={() => callNumber(OFFICIAL_NUMBERS.healthAdvice)}>KESIHATAN 937<span>Nasihat dan sokongan kesihatan 24/7</span></button>
      </> : null}

      {view === 'hotel' && <button className="emergency-primary" onClick={() => openMap('hotel')}>PETA KE HOTEL<span>Guna peta jalan / fallback kompas</span></button>}
      {(view === 'bus' || view === 'lost') && <button className="emergency-primary" onClick={() => openMap('group')}>PETA KE KUMPULAN<span>Meeting point yang disimpan</span></button>}
      {view === 'lost' && <button className="emergency-secondary" onClick={() => openMap('hotel')}>PETA KE HOTEL</button>}
      <button className="emergency-secondary" onClick={() => setView('card')}>TUNJUK KAD KESELAMATAN</button>
      {mutawwifPhone && <button className="emergency-secondary" onClick={() => callNumber(mutawwifPhone)}>HUBUNGI MUTAWWIF</button>}
      {contact?.phone && <button className="emergency-secondary" onClick={() => callNumber(contact.phone)}>HUBUNGI KELUARGA</button>}
    </Shell>;
  }

  return <Shell online={online}>
    <div className="emergency-hero">
      <div className="eyebrow">Crisis Mode</div>
      <h1>BANTU SAYA SEKARANG</h1>
      <p>Tekan satu pilihan sahaja. Tidak perlu menaip.</p>
    </div>

    <button className="emergency-danger" onClick={() => setView('lost')}>SAYA SESAT / TERPISAH<span>Peta, kad bantuan, mutawwif dan keluarga</span></button>
    <button className="emergency-danger" onClick={() => setView('medical')}>SAYA TAK SIHAT<span>Ambulans 997 • Kecemasan 911 • Kesihatan 937</span></button>
    <button className="emergency-primary" onClick={() => setView('bus')}>SAYA TAK JUMPA BAS / KUMPULAN<span>Terus ke meeting point tersimpan</span></button>
    <button className="emergency-primary" onClick={() => setView('hotel')}>SAYA MAHU BALIK HOTEL<span>Terus ke hotel tersimpan</span></button>
    <button className="emergency-secondary" onClick={() => setView('card')}>TUNJUK KAD KESELAMATAN<span>Hotel • kumpulan • mutawwif • keluarga</span></button>
    {mutawwifPhone && <button className="emergency-secondary" onClick={() => callNumber(mutawwifPhone)}>HUBUNGI MUTAWWIF</button>}
    <button className="emergency-back-home" onClick={() => { window.location.href = '/?app=teman'; }}>KEMBALI KE TEMAN</button>
  </Shell>;
}

function Shell({ online, children, onBack }: { online: boolean; children: React.ReactNode; onBack?: () => void }) {
  return <main className="teman-app teman-emergency-app">
    <header className="teman-header">
      <div><strong>TEMAN Haramain</strong><span> by <b>TGPU</b></span></div>
      <div className={online ? 'status online' : 'status offline'}>{online ? 'Online' : 'Offline • bantuan asas masih tersedia'}</div>
    </header>
    <section className="teman-content emergency-content">
      {onBack && <button className="back" onClick={onBack}>← Kembali</button>}
      {children}
    </section>
  </main>;
}

function SafetyCard({ card }: { card?: SafetyCardData }) {
  return <div className="safety-card emergency-safety-card">
    <div className="flag">MALAYSIA</div>
    <h2>{card?.pilgrimName || 'Nama jemaah belum disimpan'}</h2>
    <div className="emergency-arabic" dir="rtl">أنا حاج من ماليزيا وقد انفصلت عن مجموعتي. الرجاء مساعدتي.</div>
    <Info label="HOTEL" value={card?.hotelName || 'Belum disimpan'} />
    <Info label="العنوان" value={card?.hotelAddressArabic || 'غير متوفر'} rtl />
    <Info label="GROUP / BUS" value={`${card?.groupCode || '—'} • ${card?.busNumber || '—'}`} />
    <Info label="MUTAWWIF" value={`${card?.mutawwifName || '—'} • ${card?.mutawwifPhone || '—'}`} />
    <Info label="FAMILY" value={card?.emergencyContactPhone || '—'} />
    {typeof card?.hotelLatitude === 'number' && typeof card.hotelLongitude === 'number' && <Info label="GPS" value={`${card.hotelLatitude.toFixed(6)}, ${card.hotelLongitude.toFixed(6)}`} />}
    <small>Draf prototaip • Ayat Arab menunggu semakan manusia akhir</small>
  </div>;
}

function Info({ label, value, rtl }: { label: string; value: string; rtl?: boolean }) {
  return <div className="info-row"><span>{label}</span><strong dir={rtl ? 'rtl' : undefined}>{value}</strong></div>;
}
