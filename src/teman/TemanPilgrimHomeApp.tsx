import { useEffect, useState } from 'react';
import { IndexedDbLocalStore } from '../core/storage/indexedDb';
import { TemanRepository } from './repository';
import { isTemanDemoMode } from './demoData';
import { useTemanLocale } from './temanLocale';
import type { OfflineReadiness, PilgrimProfile, TravelPlan } from './types';
import './teman-offline.css';
import './teman-home.css';

const store = new IndexedDbLocalStore();
const repo = new TemanRepository(store);

const COPY = {
  ms: {
    online: 'Online', offline: 'Offline • TEMAN masih boleh digunakan', senior: 'Senior Safety Mode', hello: 'Assalamualaikum',
    prompt: 'Apa yang anda perlukan?', intro: 'Tekan satu pilihan sahaja. Maklumat penting disimpan pada telefon.',
    help: 'BANTU SAYA SEKARANG', helpHint: 'Sesat, sakit, terpisah atau perlukan bantuan', hotel: 'BALIK KE HOTEL', hotelHint: 'Peta terus ke hotel tersimpan',
    group: 'CARI KUMPULAN SAYA', groupHint: 'Meeting point, bas dan mutawwif', translate: 'TERJEMAH', translateHint: 'BM • العربية • English',
    ibadah: 'PANDUAN IBADAH', ibadahHint: 'Rujukan Umrah Malaysia untuk prototaip', reminders: 'PERINGATAN', remindersHint: 'Ubat, air dan tugasan penting',
    family: 'FAMILY LINK', familyHint: 'Check-in dan perkongsian dengan keluarga', ready: 'TRAVEL READY', readyHint: 'Semak persediaan sebelum berlepas',
    shopping: 'BELANJA & KIRA', shoppingHint: 'SAR ↔ RM • bajet • senarai • bagasi — powered by SATU',
    setupMissing: 'Data perjalanan belum lengkap', setupHint: 'Minta keluarga lengkapkan Travel Ready dahulu.', demo: 'DATA DEMO AKTIF', demoHint: 'Semua nama/nombor dalam mod ini ialah contoh rekaan.',
    readyYes: 'OFFLINE READY', readyNo: 'BELUM OFFLINE READY', tester: 'BUKA HALAMAN TESTER', anonymous: 'Jemaah', hotelLabel: 'Hotel', groupLabel: 'Kumpulan',
  },
  en: {
    online: 'Online', offline: 'Offline • TEMAN is still available', senior: 'Senior Safety Mode', hello: 'Welcome',
    prompt: 'What do you need?', intro: 'Choose one option. Important information is stored on the phone.',
    help: 'HELP ME NOW', helpHint: 'Lost, unwell, separated, or need assistance', hotel: 'RETURN TO HOTEL', hotelHint: 'Open the map to your saved hotel',
    group: 'FIND MY GROUP', groupHint: 'Meeting point, bus, and mutawwif', translate: 'TRANSLATE', translateHint: 'BM • العربية • English',
    ibadah: 'IBADAH GUIDE', ibadahHint: 'Malaysia Umrah reference for the prototype', reminders: 'REMINDERS', remindersHint: 'Medicine, hydration, and important tasks',
    family: 'FAMILY LINK', familyHint: 'Check-in and sharing with family', ready: 'TRAVEL READY', readyHint: 'Check preparation before departure',
    shopping: 'SHOPPING & CALCULATE', shoppingHint: 'SAR ↔ RM • budget • list • baggage — powered by SATU',
    setupMissing: 'Travel data is not complete', setupHint: 'Ask the family to complete Travel Ready first.', demo: 'DEMO DATA ACTIVE', demoHint: 'All names and numbers in this mode are fictional samples.',
    readyYes: 'OFFLINE READY', readyNo: 'NOT OFFLINE READY', tester: 'OPEN TESTER PAGE', anonymous: 'Pilgrim', hotelLabel: 'Hotel', groupLabel: 'Group',
  },
  ar: {
    online: 'متصل', offline: 'دون إنترنت • TEMAN ما زال يعمل', senior: 'وضع السلامة لكبار السن', hello: 'السلام عليكم',
    prompt: 'ماذا تحتاج؟', intro: 'اختر خيارًا واحدًا فقط. المعلومات المهمة محفوظة على الهاتف.',
    help: 'ساعدني الآن', helpHint: 'ضائع أو مريض أو منفصل عن المجموعة أو تحتاج إلى مساعدة', hotel: 'العودة إلى الفندق', hotelHint: 'فتح الخريطة إلى الفندق المحفوظ',
    group: 'العثور على مجموعتي', groupHint: 'نقطة التجمع والحافلة والمطوف', translate: 'الترجمة', translateHint: 'BM • العربية • English',
    ibadah: 'دليل العبادة', ibadahHint: 'مرجع العمرة الماليزي في النموذج الأولي', reminders: 'التذكيرات', remindersHint: 'الدواء والماء والمهام المهمة',
    family: 'رابط الأسرة', familyHint: 'تسجيل الوصول والمشاركة مع الأسرة', ready: 'الجاهزية للسفر', readyHint: 'مراجعة الاستعداد قبل السفر',
    shopping: 'التسوق والحساب', shoppingHint: 'SAR ↔ RM • الميزانية • القائمة • الأمتعة — powered by SATU',
    setupMissing: 'بيانات الرحلة غير مكتملة', setupHint: 'اطلب من الأسرة إكمال الجاهزية للسفر أولًا.', demo: 'بيانات العرض مفعلة', demoHint: 'جميع الأسماء والأرقام في هذا الوضع أمثلة وهمية.',
    readyYes: 'جاهز دون إنترنت', readyNo: 'غير جاهز دون إنترنت', tester: 'فتح صفحة المختبر', anonymous: 'الحاج / المعتمر', hotelLabel: 'الفندق', groupLabel: 'المجموعة',
  },
} as const;

export default function TemanPilgrimHomeApp() {
  const [locale] = useTemanLocale();
  const t = COPY[locale];
  const [online, setOnline] = useState(navigator.onLine);
  const [profile, setProfile] = useState<PilgrimProfile | undefined>();
  const [travel, setTravel] = useState<TravelPlan | undefined>();
  const [readiness, setReadiness] = useState<OfflineReadiness>({ ready: false, requiredMissing: [], optionalMissing: [] });
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    const onConnection = () => setOnline(navigator.onLine);
    window.addEventListener('online', onConnection);
    window.addEventListener('offline', onConnection);
    void (async () => {
      const [savedProfile, savedTravel, ready, demoMode] = await Promise.all([
        repo.getPilgrim(), repo.getTravelPlan(), repo.assessOfflineReadiness(), isTemanDemoMode(),
      ]);
      setProfile(savedProfile);
      setTravel(savedTravel);
      setReadiness(ready);
      setDemo(demoMode);
    })();
    return () => {
      window.removeEventListener('online', onConnection);
      window.removeEventListener('offline', onConnection);
    };
  }, []);

  const hotel = travel?.makkahHotel ?? travel?.madinahHotel;
  const hasCoreTrip = Boolean(profile?.fullName && hotel?.name && travel?.group?.mutawwifPhone);

  return <main className="teman-app teman-home-v2" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
    <header className="teman-header">
      <div><strong>TEMAN Haramain</strong><span> by <b>TGPU</b></span></div>
      <div className={online ? 'status online' : 'status offline'}>{online ? t.online : t.offline}</div>
    </header>

    <section className="teman-content">
      <div className="hero teman-home-hero">
        <div className="eyebrow">{t.senior}</div>
        <h1>{t.hello}{profile?.preferredName ? `, ${profile.preferredName}` : ''}</h1>
        <h2>{t.prompt}</h2>
        <p>{t.intro}</p>
      </div>

      {demo && <div className="teman-demo-banner"><strong>{t.demo}</strong><span>{t.demoHint}</span></div>}
      {!hasCoreTrip && <button className="teman-setup-warning" onClick={() => { window.location.href = '/?app=teman-ready'; }}><strong>{t.setupMissing}</strong><span>{t.setupHint}</span></button>}

      <div className="teman-trip-glance">
        <div><span>{t.hotelLabel}</span><strong>{hotel?.name || '—'}</strong></div>
        <div><span>{t.groupLabel}</span><strong>{travel?.group?.groupCode || travel?.group?.busNumber || '—'}</strong></div>
        <div className={readiness.ready ? 'ready' : 'not-ready'}><span>Offline</span><strong>{readiness.ready ? t.readyYes : t.readyNo}</strong></div>
      </div>

      <button className="danger huge" onClick={() => { window.location.href = '/?app=teman-emergency'; }}>{t.help}<span>{t.helpHint}</span></button>
      <div className="teman-home-pair">
        <button className="action huge" onClick={() => { window.location.href = '/?app=teman-streets&target=hotel'; }}>{t.hotel}<span>{t.hotelHint}</span></button>
        <button className="action huge" onClick={() => { window.location.href = '/?app=teman-streets&target=group'; }}>{t.group}<span>{t.groupHint}</span></button>
      </div>
      <div className="teman-home-grid">
        <button onClick={() => { window.location.href = '/?app=teman-translate'; }}><strong>{t.translate}</strong><span>{t.translateHint}</span></button>
        <button onClick={() => { window.location.href = '/?app=teman-ibadah'; }}><strong>{t.ibadah}</strong><span>{t.ibadahHint}</span></button>
        <button onClick={() => { window.location.href = '/?app=teman-reminders'; }}><strong>{t.reminders}</strong><span>{t.remindersHint}</span></button>
        <button onClick={() => { window.location.href = '/?app=teman-family'; }}><strong>{t.family}</strong><span>{t.familyHint}</span></button>
        <button onClick={() => { window.location.href = '/?app=teman-ready'; }}><strong>{t.ready}</strong><span>{t.readyHint}</span></button>
        <button onClick={() => { window.location.href = '/?app=teman-satu'; }}><strong>{t.shopping}</strong><span>{t.shoppingHint}</span></button>
      </div>

      {demo && <button className="action big tester-link-home" onClick={() => { window.location.href = '/?app=teman-preview'; }}>{t.tester}</button>}
    </section>
  </main>;
}
