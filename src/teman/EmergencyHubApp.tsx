import { useEffect, useState, type ReactNode } from 'react';
import { IndexedDbLocalStore } from '../core/storage/indexedDb';
import { findEmergencyPhrase } from './emergencyPhrases';
import { TemanRepository } from './repository';
import { useTemanLocale } from './temanLocale';
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

const COPY = {
  ms: {
    safetyCard: 'Kad Keselamatan', showScreen: 'Tunjukkan skrin ini kepada petugas, pemandu atau orang yang membantu.',
    mapHotel: 'PETA KE HOTEL', mutawwif: 'HUBUNGI MUTAWWIF', family: 'HUBUNGI KELUARGA',
    medicalTitle: 'Saya Tak Sihat', hotelTitle: 'Balik Ke Hotel', busTitle: 'Cari Bas / Kumpulan', lostTitle: 'Saya Sesat / Terpisah',
    draft: 'Draf prototaip • Bahasa Arab menunggu semakan manusia akhir', ambulance: 'AMBULANS 997', ambulanceHint: 'Kecemasan perubatan',
    emergency: 'KECEMASAN 911', emergencyHint: 'Nombor kecemasan bersepadu Saudi', health: 'KESIHATAN 937', healthHint: 'Nasihat dan sokongan kesihatan 24/7',
    mapHotelHint: 'Guna peta jalan / fallback kompas', mapGroup: 'PETA KE KUMPULAN', mapGroupHint: 'Meeting point yang disimpan', showCard: 'TUNJUK KAD KESELAMATAN',
    mode: 'Crisis Mode', helpNow: 'BANTU SAYA SEKARANG', oneTap: 'Tekan satu pilihan sahaja. Tidak perlu menaip.',
    lost: 'SAYA SESAT / TERPISAH', lostHint: 'Peta, kad bantuan, mutawwif dan keluarga', unwell: 'SAYA TAK SIHAT', unwellHint: 'Ambulans 997 • Kecemasan 911 • Kesihatan 937',
    bus: 'SAYA TAK JUMPA BAS / KUMPULAN', busHint: 'Terus ke meeting point tersimpan', hotel: 'SAYA MAHU BALIK HOTEL', hotelHint: 'Terus ke hotel tersimpan',
    cardHint: 'Hotel • kumpulan • mutawwif • keluarga', backHome: 'KEMBALI KE TEMAN', back: '← Kembali',
    offline: 'Offline • bantuan asas masih tersedia', unknownPilgrim: 'Nama jemaah belum disimpan', notSaved: 'Belum disimpan', familyLabel: 'KELUARGA', groupLabel: 'KUMPULAN / BAS',
  },
  en: {
    safetyCard: 'Safety Card', showScreen: 'Show this screen to staff, a driver, or anyone helping you.',
    mapHotel: 'MAP TO HOTEL', mutawwif: 'CALL MUTAWWIF', family: 'CALL FAMILY',
    medicalTitle: 'I Am Unwell', hotelTitle: 'Return to Hotel', busTitle: 'Find Bus / Group', lostTitle: 'I Am Lost / Separated',
    draft: 'Prototype draft • Arabic wording awaits final human review', ambulance: 'AMBULANCE 997', ambulanceHint: 'Medical emergency',
    emergency: 'EMERGENCY 911', emergencyHint: 'Saudi unified emergency number', health: 'HEALTH 937', healthHint: 'Health advice and support 24/7',
    mapHotelHint: 'Street map / compass fallback', mapGroup: 'MAP TO GROUP', mapGroupHint: 'Saved meeting point', showCard: 'SHOW SAFETY CARD',
    mode: 'Crisis Mode', helpNow: 'HELP ME NOW', oneTap: 'Choose one option. No typing is required.',
    lost: 'I AM LOST / SEPARATED', lostHint: 'Map, Safety Card, mutawwif, and family', unwell: 'I AM UNWELL', unwellHint: 'Ambulance 997 • Emergency 911 • Health 937',
    bus: 'I CANNOT FIND MY BUS / GROUP', busHint: 'Go directly to the saved meeting point', hotel: 'I WANT TO RETURN TO MY HOTEL', hotelHint: 'Go directly to the saved hotel',
    cardHint: 'Hotel • group • mutawwif • family', backHome: 'BACK TO TEMAN', back: '← Back',
    offline: 'Offline • core help is still available', unknownPilgrim: 'Pilgrim name not saved', notSaved: 'Not saved', familyLabel: 'FAMILY', groupLabel: 'GROUP / BUS',
  },
  ar: {
    safetyCard: 'بطاقة السلامة', showScreen: 'أرِ هذه الشاشة للموظف أو السائق أو أي شخص يساعدك.',
    mapHotel: 'الخريطة إلى الفندق', mutawwif: 'الاتصال بالمطوف', family: 'الاتصال بالأسرة',
    medicalTitle: 'أنا لست بخير', hotelTitle: 'العودة إلى الفندق', busTitle: 'العثور على الحافلة / المجموعة', lostTitle: 'أنا ضائع / منفصل عن المجموعة',
    draft: 'مسودة نموذج أولي • النص العربي بانتظار المراجعة البشرية النهائية', ambulance: 'الإسعاف 997', ambulanceHint: 'حالة طبية طارئة',
    emergency: 'الطوارئ 911', emergencyHint: 'رقم الطوارئ الموحد في السعودية', health: 'الصحة 937', healthHint: 'استشارات ودعم صحي على مدار الساعة',
    mapHotelHint: 'خريطة الشوارع / بوصلة احتياطية', mapGroup: 'الخريطة إلى المجموعة', mapGroupHint: 'نقطة التجمع المحفوظة', showCard: 'إظهار بطاقة السلامة',
    mode: 'وضع الطوارئ', helpNow: 'ساعدني الآن', oneTap: 'اختر خيارًا واحدًا فقط. لا حاجة للكتابة.',
    lost: 'أنا ضائع / منفصل', lostHint: 'الخريطة وبطاقة السلامة والمطوف والأسرة', unwell: 'أنا لست بخير', unwellHint: 'الإسعاف 997 • الطوارئ 911 • الصحة 937',
    bus: 'لا أجد الحافلة / المجموعة', busHint: 'الانتقال مباشرة إلى نقطة التجمع المحفوظة', hotel: 'أريد العودة إلى الفندق', hotelHint: 'الانتقال مباشرة إلى الفندق المحفوظ',
    cardHint: 'الفندق • المجموعة • المطوف • الأسرة', backHome: 'العودة إلى TEMAN', back: 'رجوع →',
    offline: 'دون إنترنت • المساعدة الأساسية ما زالت متاحة', unknownPilgrim: 'اسم الحاج غير محفوظ', notSaved: 'غير محفوظ', familyLabel: 'الأسرة', groupLabel: 'المجموعة / الحافلة',
  },
} as const;

export default function EmergencyHubApp() {
  const [locale] = useTemanLocale();
  const t = COPY[locale];
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
    return <Shell online={online} locale={locale} onBack={() => setView('home')}>
      <h1>{t.safetyCard}</h1>
      <p className="emergency-lead">{t.showScreen}</p>
      <SafetyCard card={card} locale={locale} />
      <button className="emergency-primary" onClick={() => openMap('hotel')}>{t.mapHotel}</button>
      {mutawwifPhone && <button className="emergency-secondary" onClick={() => callNumber(mutawwifPhone)}>{t.mutawwif}</button>}
      {contact?.phone && <button className="emergency-secondary" onClick={() => callNumber(contact.phone)}>{t.family}</button>}
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
    const title = view === 'medical' ? t.medicalTitle : view === 'hotel' ? t.hotelTitle : view === 'bus' ? t.busTitle : t.lostTitle;

    return <Shell online={online} locale={locale} onBack={() => setView('home')}>
      <h1>{title}</h1>
      {phrase && <div className="emergency-phrase-card">
        <div className="emergency-arabic" dir="rtl">{phrase.ar}</div>
        {locale !== 'ar' && <strong>{locale === 'en' ? phrase.en : phrase.ms}</strong>}
        {locale === 'ms' && <span>{phrase.en}</span>}
        {locale === 'en' && <span>{phrase.ms}</span>}
        <small>{t.draft}</small>
      </div>}

      {view === 'medical' ? <>
        <button className="emergency-danger" onClick={() => callNumber(OFFICIAL_NUMBERS.ambulance)}>{t.ambulance}<span>{t.ambulanceHint}</span></button>
        <button className="emergency-danger" onClick={() => callNumber(OFFICIAL_NUMBERS.unifiedEmergency)}>{t.emergency}<span>{t.emergencyHint}</span></button>
        <button className="emergency-primary" onClick={() => callNumber(OFFICIAL_NUMBERS.healthAdvice)}>{t.health}<span>{t.healthHint}</span></button>
      </> : null}

      {view === 'hotel' && <button className="emergency-primary" onClick={() => openMap('hotel')}>{t.mapHotel}<span>{t.mapHotelHint}</span></button>}
      {(view === 'bus' || view === 'lost') && <button className="emergency-primary" onClick={() => openMap('group')}>{t.mapGroup}<span>{t.mapGroupHint}</span></button>}
      {view === 'lost' && <button className="emergency-secondary" onClick={() => openMap('hotel')}>{t.mapHotel}</button>}
      <button className="emergency-secondary" onClick={() => setView('card')}>{t.showCard}</button>
      {mutawwifPhone && <button className="emergency-secondary" onClick={() => callNumber(mutawwifPhone)}>{t.mutawwif}</button>}
      {contact?.phone && <button className="emergency-secondary" onClick={() => callNumber(contact.phone)}>{t.family}</button>}
    </Shell>;
  }

  return <Shell online={online} locale={locale}>
    <div className="emergency-hero">
      <div className="eyebrow">{t.mode}</div>
      <h1>{t.helpNow}</h1>
      <p>{t.oneTap}</p>
    </div>

    <button className="emergency-danger" onClick={() => setView('lost')}>{t.lost}<span>{t.lostHint}</span></button>
    <button className="emergency-danger" onClick={() => setView('medical')}>{t.unwell}<span>{t.unwellHint}</span></button>
    <button className="emergency-primary" onClick={() => setView('bus')}>{t.bus}<span>{t.busHint}</span></button>
    <button className="emergency-primary" onClick={() => setView('hotel')}>{t.hotel}<span>{t.hotelHint}</span></button>
    <button className="emergency-secondary" onClick={() => setView('card')}>{t.showCard}<span>{t.cardHint}</span></button>
    {mutawwifPhone && <button className="emergency-secondary" onClick={() => callNumber(mutawwifPhone)}>{t.mutawwif}</button>}
    <button className="emergency-back-home" onClick={() => { window.location.href = '/?app=teman'; }}>{t.backHome}</button>
  </Shell>;
}

function Shell({ online, locale, children, onBack }: { online: boolean; locale: 'ms' | 'en' | 'ar'; children: ReactNode; onBack?: () => void }) {
  const t = COPY[locale];
  return <main className="teman-app teman-emergency-app" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
    <header className="teman-header">
      <div><strong>TEMAN Haramain</strong><span> by <b>TGPU</b></span></div>
      <div className={online ? 'status online' : 'status offline'}>{online ? 'Online' : t.offline}</div>
    </header>
    <section className="teman-content emergency-content">
      {onBack && <button className="back" onClick={onBack}>{t.back}</button>}
      {children}
    </section>
  </main>;
}

function SafetyCard({ card, locale }: { card?: SafetyCardData; locale: 'ms' | 'en' | 'ar' }) {
  const t = COPY[locale];
  return <div className="safety-card emergency-safety-card">
    <div className="flag">MALAYSIA</div>
    <h2>{card?.pilgrimName || t.unknownPilgrim}</h2>
    <div className="emergency-arabic" dir="rtl">أنا حاج من ماليزيا وقد انفصلت عن مجموعتي. الرجاء مساعدتي.</div>
    <Info label="HOTEL" value={card?.hotelName || t.notSaved} />
    <Info label="العنوان" value={card?.hotelAddressArabic || 'غير متوفر'} rtl />
    <Info label={t.groupLabel} value={`${card?.groupCode || '—'} • ${card?.busNumber || '—'}`} />
    <Info label="MUTAWWIF" value={`${card?.mutawwifName || '—'} • ${card?.mutawwifPhone || '—'}`} />
    <Info label={t.familyLabel} value={card?.emergencyContactPhone || '—'} />
    {typeof card?.hotelLatitude === 'number' && typeof card.hotelLongitude === 'number' && <Info label="GPS" value={`${card.hotelLatitude.toFixed(6)}, ${card.hotelLongitude.toFixed(6)}`} />}
    <small>{t.draft}</small>
  </div>;
}

function Info({ label, value, rtl }: { label: string; value: string; rtl?: boolean }) {
  return <div className="info-row"><span>{label}</span><strong dir={rtl ? 'rtl' : undefined}>{value}</strong></div>;
}
