import TemanOfflineApp from './TemanOfflineApp';
import { useTemanLocale } from './temanLocale';
import './teman-reminders.css';

const COPY = {
  ms: {
    crisis: 'BANTU SAYA SEKARANG', crisisHint: 'Sesat • sakit • bas • hotel — satu tekan',
    hotel: 'BALIK KE HOTEL', hotelHint: 'Peta terus ke hotel', group: 'CARI KUMPULAN', groupHint: 'Meeting point tersimpan',
    ready: 'TRAVEL READY', readyHint: 'Keluarga sediakan & uji offline sebelum berlepas', family: 'FAMILY LINK', map: 'PETA', ibadah: 'IBADAH', translate: 'TERJEMAH', reminders: 'PERINGATAN',
  },
  en: {
    crisis: 'HELP ME NOW', crisisHint: 'Lost • unwell • bus • hotel — one tap',
    hotel: 'RETURN TO HOTEL', hotelHint: 'Open map directly to hotel', group: 'FIND MY GROUP', groupHint: 'Saved meeting point',
    ready: 'TRAVEL READY', readyHint: 'Family prepares & tests offline before departure', family: 'FAMILY LINK', map: 'MAP', ibadah: 'IBADAH', translate: 'TRANSLATE', reminders: 'REMINDERS',
  },
  ar: {
    crisis: 'ساعدني الآن', crisisHint: 'ضائع • مريض • الحافلة • الفندق — ضغطة واحدة',
    hotel: 'العودة إلى الفندق', hotelHint: 'فتح الخريطة مباشرة إلى الفندق', group: 'العثور على مجموعتي', groupHint: 'نقطة التجمع المحفوظة',
    ready: 'الجاهزية للسفر', readyHint: 'تقوم الأسرة بالإعداد واختبار العمل دون إنترنت قبل السفر', family: 'رابط الأسرة', map: 'الخريطة', ibadah: 'العبادة', translate: 'الترجمة', reminders: 'التذكيرات',
  },
} as const;

export default function TemanPortalApp() {
  const [locale] = useTemanLocale();
  const t = COPY[locale];

  return <div className="teman-portal" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
    <TemanOfflineApp />
    <nav className="teman-portal-nav" aria-label="TEMAN quick safety tools">
      <button className="crisis-shortcut" onClick={() => { window.location.href = '/?app=teman-emergency'; }}>
        <strong>{t.crisis}</strong>
        <span>{t.crisisHint}</span>
      </button>
      <div className="teman-safety-shortcuts">
        <button className="hotel" onClick={() => { window.location.href = '/?app=teman-streets&target=hotel'; }}>
          <strong>{t.hotel}</strong>
          <span>{t.hotelHint}</span>
        </button>
        <button className="group" onClick={() => { window.location.href = '/?app=teman-streets&target=group'; }}>
          <strong>{t.group}</strong>
          <span>{t.groupHint}</span>
        </button>
      </div>
      <button className="travel-ready-shortcut" onClick={() => { window.location.href = '/?app=teman-ready'; }}>
        <strong>{t.ready}</strong>
        <span>{t.readyHint}</span>
      </button>
      <div className="teman-tool-grid">
        <button className="family" onClick={() => { window.location.href = '/?app=teman-family'; }}>{t.family}</button>
        <button className="navigate" onClick={() => { window.location.href = '/?app=teman-streets'; }}>{t.map}</button>
        <button className="ibadah" onClick={() => { window.location.href = '/?app=teman-ibadah'; }}>{t.ibadah}</button>
        <button className="translate" onClick={() => { window.location.href = '/?app=teman-translate'; }}>{t.translate}</button>
        <button className="reminders" onClick={() => { window.location.href = '/?app=teman-reminders'; }}>{t.reminders}</button>
      </div>
    </nav>
  </div>;
}
