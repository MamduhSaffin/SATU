import { FormEvent, useMemo, useState } from 'react';
import { useTemanLocale } from './temanLocale';
import './teman-tester.css';

type FeedbackCopy = {
  title: string; intro: string; role: string; ease: string; best: string; confusing: string; missing: string;
  submit: string; back: string; saved: string; copy: string; note: string; roles: string[];
};

const COPY: Record<'ms' | 'en' | 'ar', FeedbackCopy> = {
  ms: {
    title: 'Maklum Balas Penguji', intro: 'Bantu kami faham apa yang jelas, mengelirukan atau masih belum cukup untuk jemaah.',
    role: 'Anda menguji sebagai', ease: 'Sejauh mana TEMAN mudah difahami?', best: 'Bahagian paling berguna',
    confusing: 'Apa yang mengelirukan?', missing: 'Apa yang masih tiada?', submit: 'SIMPAN MAKLUM BALAS',
    back: 'KEMBALI KE PROTOTYPE', saved: 'Maklum balas disimpan pada peranti ini untuk demo.', copy: 'SALIN RINGKASAN',
    note: 'Prototype tidak menghantar data ini ke pelayan secara automatik.',
    roles: ['Jemaah / bakal jemaah', 'Ahli keluarga', 'Mutawwif / pembimbing', 'Petugas / institusi', 'Lain-lain'],
  },
  en: {
    title: 'Tester Feedback', intro: 'Help us understand what is clear, confusing, or still missing for pilgrims.',
    role: 'You are testing as', ease: 'How easy is TEMAN to understand?', best: 'Most useful part',
    confusing: 'What was confusing?', missing: 'What is still missing?', submit: 'SAVE FEEDBACK',
    back: 'BACK TO PROTOTYPE', saved: 'Feedback saved on this device for the demo.', copy: 'COPY SUMMARY',
    note: 'This prototype does not automatically send this data to a server.',
    roles: ['Pilgrim / future pilgrim', 'Family member', 'Mutawwif / guide', 'Staff / institution', 'Other'],
  },
  ar: {
    title: 'ملاحظات المختبر', intro: 'ساعدنا على معرفة ما هو واضح أو مربك أو ما الذي ما زال يحتاجه الحاج أو المعتمر.',
    role: 'أنت تختبر بصفتك', ease: 'ما مدى سهولة فهم TEMAN؟', best: 'أكثر جزء مفيد',
    confusing: 'ما الذي كان مربكًا؟', missing: 'ما الذي ما زال ناقصًا؟', submit: 'حفظ الملاحظات',
    back: 'العودة إلى النموذج', saved: 'تم حفظ الملاحظات على هذا الجهاز لأغراض العرض.', copy: 'نسخ الملخص',
    note: 'هذا النموذج الأولي لا يرسل هذه البيانات تلقائيًا إلى أي خادم.',
    roles: ['حاج / معتمر', 'أحد أفراد الأسرة', 'مطوف / مرشد', 'موظف / جهة', 'أخرى'],
  },
};

export default function TesterFeedbackApp() {
  const [locale] = useTemanLocale();
  const t = COPY[locale];
  const [role, setRole] = useState(t.roles[0]);
  const [ease, setEase] = useState('4');
  const [best, setBest] = useState('');
  const [confusing, setConfusing] = useState('');
  const [missing, setMissing] = useState('');
  const [saved, setSaved] = useState(false);

  const summary = useMemo(() => [
    `TEMAN tester feedback`,
    `Role: ${role}`,
    `Ease: ${ease}/5`,
    `Most useful: ${best || '—'}`,
    `Confusing: ${confusing || '—'}`,
    `Missing: ${missing || '—'}`,
  ].join('\n'), [role, ease, best, confusing, missing]);

  function submit(event: FormEvent) {
    event.preventDefault();
    localStorage.setItem('teman.tester.feedback.latest', JSON.stringify({ role, ease, best, confusing, missing, savedAt: Date.now() }));
    setSaved(true);
  }

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summary);
      setSaved(true);
    } catch {
      window.prompt('Copy feedback', summary);
    }
  }

  return <main className="tester-app" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
    <header className="tester-topbar">
      <div><strong>TEMAN Haramain</strong><span> by <b>TGPU</b></span></div>
      <div className="tester-version">TESTER</div>
    </header>
    <section className="tester-section tester-feedback">
      <h1>{t.title}</h1>
      <p>{t.intro}</p>
      <form onSubmit={submit}>
        <label><span>{t.role}</span><select value={role} onChange={(e) => setRole(e.target.value)}>{t.roles.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span>{t.ease}</span><select value={ease} onChange={(e) => setEase(e.target.value)}><option value="1">1 / 5</option><option value="2">2 / 5</option><option value="3">3 / 5</option><option value="4">4 / 5</option><option value="5">5 / 5</option></select></label>
        <label><span>{t.best}</span><textarea value={best} onChange={(e) => setBest(e.target.value)} /></label>
        <label><span>{t.confusing}</span><textarea value={confusing} onChange={(e) => setConfusing(e.target.value)} /></label>
        <label><span>{t.missing}</span><textarea value={missing} onChange={(e) => setMissing(e.target.value)} /></label>
        <button className="tester-start" type="submit">{t.submit}</button>
      </form>
      {saved && <div className="tester-message">{t.saved}</div>}
      <p className="tester-muted">{t.note}</p>
      <div className="tester-footer-actions">
        <button type="button" onClick={() => void copySummary()}>{t.copy}</button>
        <button type="button" onClick={() => { window.location.href = '/?app=teman-preview'; }}>{t.back}</button>
      </div>
    </section>
  </main>;
}
