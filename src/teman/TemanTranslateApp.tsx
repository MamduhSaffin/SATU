import { useMemo, useState } from 'react';
import { directionForLocale, type SupportedLocale } from '../core/i18n';
import { EMERGENCY_PHRASES } from './emergencyPhrases';
import { speakArabic } from './audio';
import './teman-offline.css';
import './teman-translate.css';

type UiCopy = {
  title: string;
  subtitle: string;
  choose: string;
  show: string;
  play: string;
  copy: string;
  back: string;
  copied: string;
  audioStarted: string;
  audioUnavailable: string;
  categories: Record<string, string>;
};

const copy: Record<SupportedLocale, UiCopy> = {
  ms: {
    title: 'TEMAN Terjemah',
    subtitle: 'Terjemahan kecemasan pantas • boleh digunakan offline',
    choose: 'Apa yang anda mahu cakap?',
    show: 'TUNJUK SKRIN BESAR',
    play: 'MAIN BAHASA ARAB',
    copy: 'SALIN AYAT',
    back: 'Kembali ke TEMAN',
    copied: 'Ayat telah disalin.',
    audioStarted: 'Audio Bahasa Arab sedang dimainkan.',
    audioUnavailable: 'Audio tidak tersedia pada peranti ini. Tunjukkan teks Arab di skrin.',
    categories: { lost: 'Sesat / terpisah', hotel: 'Hotel', group: 'Kumpulan', health: 'Kesihatan', transport: 'Bas / pengangkutan' },
  },
  ar: {
    title: 'ترجمة TEMAN',
    subtitle: 'عبارات مساعدة سريعة • تعمل دون إنترنت',
    choose: 'ماذا تريد أن تقول؟',
    show: 'اعرض النص بحجم كبير',
    play: 'تشغيل العربية',
    copy: 'نسخ العبارة',
    back: 'العودة إلى TEMAN',
    copied: 'تم نسخ العبارة.',
    audioStarted: 'يتم تشغيل الصوت العربي.',
    audioUnavailable: 'الصوت غير متاح على هذا الجهاز. اعرض النص العربي على الشاشة.',
    categories: { lost: 'تائه / منفصل', hotel: 'الفندق', group: 'المجموعة', health: 'الصحة', transport: 'الحافلة / النقل' },
  },
  en: {
    title: 'TEMAN Translate',
    subtitle: 'Fast emergency translation • works offline',
    choose: 'What do you want to say?',
    show: 'SHOW LARGE SCREEN',
    play: 'PLAY ARABIC',
    copy: 'COPY PHRASE',
    back: 'Back to TEMAN',
    copied: 'Phrase copied.',
    audioStarted: 'Arabic audio is playing.',
    audioUnavailable: 'Audio is unavailable on this device. Show the Arabic text on screen.',
    categories: { lost: 'Lost / separated', hotel: 'Hotel', group: 'Group', health: 'Health', transport: 'Bus / transport' },
  },
};

function storedLocale(): SupportedLocale {
  const value = localStorage.getItem('teman.locale');
  return value === 'ar' || value === 'en' ? value : 'ms';
}

export default function TemanTranslateApp() {
  const [locale, setLocale] = useState<SupportedLocale>(storedLocale);
  const [selectedId, setSelectedId] = useState(EMERGENCY_PHRASES[0].id);
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState('');

  const phrase = useMemo(
    () => EMERGENCY_PHRASES.find((item) => item.id === selectedId) ?? EMERGENCY_PHRASES[0],
    [selectedId],
  );
  const t = copy[locale];
  const dir = directionForLocale(locale);

  function switchLocale(next: SupportedLocale) {
    localStorage.setItem('teman.locale', next);
    setLocale(next);
  }

  async function copyPhrase() {
    const value = `${phrase.ms}\n${phrase.ar}\n${phrase.en}`;
    try {
      await navigator.clipboard.writeText(value);
      setMessage(t.copied);
    } catch {
      setMessage(value);
    }
  }

  async function playArabic() {
    const result = await speakArabic(phrase.ar);
    setMessage(result.played ? t.audioStarted : t.audioUnavailable);
  }

  if (expanded) {
    return <main className="teman-translate fullscreen-phrase" dir={dir}>
      <div className="translate-fullscreen-card">
        <div className="translate-fullscreen-label">العربية</div>
        <p className="translate-arabic-main" dir="rtl">{phrase.ar}</p>
        <div className="translate-divider" />
        <p className="translate-ms-main" dir="ltr">{phrase.ms}</p>
        <p className="translate-en-main" dir="ltr">{phrase.en}</p>
        <button className="translate-audio-button" onClick={() => void playArabic()}>🔊 {t.play}</button>
        <button className="translate-close-button" onClick={() => setExpanded(false)}>← {t.back}</button>
        {message && <div className="translate-message">{message}</div>}
      </div>
    </main>;
  }

  return <main className="teman-app teman-translate" dir={dir}>
    <header className="teman-header">
      <div><strong>{t.title}</strong><span> by <b>TGPU</b></span></div>
      <div className="status online">BM • العربية • EN</div>
    </header>

    <button className="back" onClick={() => { window.location.href = '/?app=teman'; }}>← {t.back}</button>

    <section className="teman-content translate-content">
      <div className="translate-language-switch" aria-label="Language">
        <button className={locale === 'ms' ? 'active' : ''} onClick={() => switchLocale('ms')}>BM</button>
        <button className={locale === 'ar' ? 'active' : ''} onClick={() => switchLocale('ar')}>العربية</button>
        <button className={locale === 'en' ? 'active' : ''} onClick={() => switchLocale('en')}>EN</button>
      </div>

      <section className="translate-intro">
        <div className="eyebrow">OFFLINE QUICK TRANSLATE</div>
        <h1>{t.choose}</h1>
        <p>{t.subtitle}</p>
      </section>

      <div className="translate-phrase-list">
        {EMERGENCY_PHRASES.map((item) => {
          const label = locale === 'ar' ? item.ar : locale === 'en' ? item.en : item.ms;
          return <button
            key={item.id}
            className={`translate-phrase-button ${selectedId === item.id ? 'selected' : ''}`}
            onClick={() => setSelectedId(item.id)}
          >
            <span>{t.categories[item.category]}</span>
            <strong>{label}</strong>
          </button>;
        })}
      </div>

      <section className="translate-result-card">
        <div className="translate-result-label">BAHASA MELAYU</div>
        <p className="translate-result-ms" dir="ltr">{phrase.ms}</p>
        <div className="translate-result-label arabic-label">العربية</div>
        <p className="translate-result-ar" dir="rtl">{phrase.ar}</p>
        <div className="translate-result-label">ENGLISH</div>
        <p className="translate-result-en" dir="ltr">{phrase.en}</p>
      </section>

      <button className="translate-primary-button" onClick={() => setExpanded(true)}>📱 {t.show}</button>
      <button className="translate-secondary-button" onClick={() => void playArabic()}>🔊 {t.play}</button>
      <button className="translate-secondary-button" onClick={() => void copyPhrase()}>📋 {t.copy}</button>
      {message && <div className="saved-banner">{message}</div>}

      <div className="ready-panel warning translate-note">
        <strong>Offline-first</strong>
        <p>Ayat kecemasan ini disimpan dalam aplikasi. Terjemahan bebas suara-ke-suara akan ditambah kemudian sebagai ciri online; fungsi kecemasan asas tidak bergantung pada internet.</p>
      </div>
    </section>
  </main>;
}
