import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useTemanLocale } from './temanLocale';
import './teman-offline.css';
import './teman-satu.css';

type Note = { id: string; text: string; createdAt: number };
type Direction = 'sar-to-myr' | 'myr-to-sar';

const NOTES_KEY = 'teman.satu.notes';
const RATE_KEY = 'teman.satu.rate.sarMyr';
const BUDGET_KEY = 'teman.satu.budget.sar';
const SPENT_KEY = 'teman.satu.spent.sar';

const COPY = {
  ms: {
    title: 'Belanja & Kira', powered: 'powered by SATU', offline: 'Berfungsi offline selepas data disimpan', back: '← Kembali ke TEMAN',
    money: 'Kira Duit', moneyIntro: 'Tukar SAR ↔ RM menggunakan kadar yang anda simpan. Kadar tidak dikemas kini sendiri ketika offline.',
    rate: 'Kadar simpanan', rateHint: '1 SAR = berapa RM?', saveRate: 'SIMPAN KADAR', sample: 'Kadar demo sahaja — semak kadar sebenar sebelum guna.',
    amountSar: 'Jumlah SAR', amountMyr: 'Jumlah RM', toMyr: 'SAR → RM', toSar: 'RM → SAR', result: 'Anggaran',
    budget: 'Bajet Belanja', budgetSar: 'Bajet (SAR)', spentSar: 'Sudah belanja (SAR)', saveBudget: 'SIMPAN BAJET', remaining: 'Baki',
    notes: 'Nota & Senarai', notesIntro: 'Simpan barang nak beli, nama kedai, hadiah, nombor bilik atau nota ringkas. Semua kekal pada telefon.',
    notePlaceholder: 'Contoh: beli 3 sejadah untuk keluarga', addNote: 'TAMBAH NOTA', empty: 'Belum ada nota.', delete: 'Padam', clear: 'PADAM SEMUA NOTA',
    demoWarning: 'Kadar wang dalam prototaip bukan kadar langsung. Pengguna perlu semak dan simpan kadar sebenar sendiri.',
  },
  en: {
    title: 'Shopping & Calculate', powered: 'powered by SATU', offline: 'Works offline after data is saved', back: '← Back to TEMAN',
    money: 'Currency Calculator', moneyIntro: 'Convert SAR ↔ RM using a rate saved on the device. The rate does not update itself while offline.',
    rate: 'Saved exchange rate', rateHint: '1 SAR = how many RM?', saveRate: 'SAVE RATE', sample: 'Demo rate only — check the real rate before use.',
    amountSar: 'SAR amount', amountMyr: 'RM amount', toMyr: 'SAR → RM', toSar: 'RM → SAR', result: 'Estimate',
    budget: 'Shopping Budget', budgetSar: 'Budget (SAR)', spentSar: 'Spent (SAR)', saveBudget: 'SAVE BUDGET', remaining: 'Remaining',
    notes: 'Notes & List', notesIntro: 'Save items to buy, shop names, gifts, room numbers, or quick notes. Everything stays on the phone.',
    notePlaceholder: 'Example: buy 3 prayer mats for family', addNote: 'ADD NOTE', empty: 'No notes yet.', delete: 'Delete', clear: 'CLEAR ALL NOTES',
    demoWarning: 'The prototype currency rate is not live. Users must check and save the real rate themselves.',
  },
  ar: {
    title: 'التسوق والحساب', powered: 'powered by SATU', offline: 'يعمل دون إنترنت بعد حفظ البيانات', back: 'العودة إلى TEMAN →',
    money: 'حاسبة العملات', moneyIntro: 'حوّل SAR ↔ RM باستخدام سعر محفوظ على الجهاز. السعر لا يتحدث تلقائيًا عند عدم توفر الإنترنت.',
    rate: 'سعر الصرف المحفوظ', rateHint: '1 ريال سعودي = كم رينغيت؟', saveRate: 'حفظ السعر', sample: 'سعر تجريبي فقط — تحقق من السعر الحقيقي قبل الاستخدام.',
    amountSar: 'المبلغ بالريال', amountMyr: 'المبلغ بالرينغيت', toMyr: 'SAR → RM', toSar: 'RM → SAR', result: 'تقدير',
    budget: 'ميزانية التسوق', budgetSar: 'الميزانية (SAR)', spentSar: 'تم إنفاقه (SAR)', saveBudget: 'حفظ الميزانية', remaining: 'المتبقي',
    notes: 'الملاحظات والقائمة', notesIntro: 'احفظ ما تريد شراءه وأسماء المتاجر والهدايا ورقم الغرفة أو أي ملاحظة سريعة. تبقى البيانات على الهاتف.',
    notePlaceholder: 'مثال: شراء 3 سجاجيد صلاة للعائلة', addNote: 'إضافة ملاحظة', empty: 'لا توجد ملاحظات بعد.', delete: 'حذف', clear: 'حذف جميع الملاحظات',
    demoWarning: 'سعر العملة في النموذج الأولي ليس سعرًا مباشرًا. يجب على المستخدم التحقق من السعر الحقيقي وحفظه بنفسه.',
  },
} as const;

function readNumber(key: string, fallback: number): number {
  const parsed = Number(localStorage.getItem(key));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function readNotes(): Note[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(NOTES_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function TemanSatuApp() {
  const [locale] = useTemanLocale();
  const t = COPY[locale];
  const [online, setOnline] = useState(navigator.onLine);
  const [rate, setRate] = useState(() => readNumber(RATE_KEY, 1.10));
  const [rateInput, setRateInput] = useState(() => String(readNumber(RATE_KEY, 1.10)));
  const [direction, setDirection] = useState<Direction>('sar-to-myr');
  const [amount, setAmount] = useState('100');
  const [budget, setBudget] = useState(() => String(readNumber(BUDGET_KEY, 500)));
  const [spent, setSpent] = useState(() => String(readNumber(SPENT_KEY, 0)));
  const [notes, setNotes] = useState<Note[]>(readNotes);
  const [draft, setDraft] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const numericAmount = Number(amount) || 0;
  const converted = useMemo(() => direction === 'sar-to-myr'
    ? numericAmount * rate
    : rate > 0 ? numericAmount / rate : 0, [direction, numericAmount, rate]);
  const budgetNumber = Number(budget) || 0;
  const spentNumber = Number(spent) || 0;
  const remaining = budgetNumber - spentNumber;

  function flash(message: string) {
    setSavedMessage(message);
    window.setTimeout(() => setSavedMessage(''), 1600);
  }

  function saveRate() {
    const value = Number(rateInput);
    if (!Number.isFinite(value) || value <= 0) return;
    setRate(value);
    localStorage.setItem(RATE_KEY, String(value));
    flash(locale === 'ar' ? 'تم حفظ السعر على الجهاز.' : locale === 'en' ? 'Rate saved on this device.' : 'Kadar disimpan pada telefon.');
  }

  function saveBudget() {
    localStorage.setItem(BUDGET_KEY, String(Math.max(0, budgetNumber)));
    localStorage.setItem(SPENT_KEY, String(Math.max(0, spentNumber)));
    flash(locale === 'ar' ? 'تم حفظ الميزانية.' : locale === 'en' ? 'Budget saved.' : 'Bajet disimpan.');
  }

  function addNote(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const next = [{ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, text, createdAt: Date.now() }, ...notes];
    setNotes(next);
    localStorage.setItem(NOTES_KEY, JSON.stringify(next));
    setDraft('');
  }

  function deleteNote(id: string) {
    const next = notes.filter((note) => note.id !== id);
    setNotes(next);
    localStorage.setItem(NOTES_KEY, JSON.stringify(next));
  }

  function clearNotes() {
    setNotes([]);
    localStorage.removeItem(NOTES_KEY);
  }

  return <main className="teman-app teman-satu-app" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
    <header className="teman-header">
      <div><strong>{t.title}</strong><span> • {t.powered}</span></div>
      <div className={online ? 'status online' : 'status offline'}>{online ? 'Online' : t.offline}</div>
    </header>

    <section className="teman-content">
      <button className="back" onClick={() => { window.location.href = '/?app=teman'; }}>{t.back}</button>
      <div className="satu-brand-card"><strong>{t.title}</strong><span>{t.powered}</span><small>{t.offline}</small></div>
      {savedMessage && <div className="saved-banner">{savedMessage}</div>}

      <section className="satu-tool-card">
        <h1>{t.money}</h1>
        <p className="lead">{t.moneyIntro}</p>
        <div className="satu-warning">{t.demoWarning}</div>
        <div className="satu-rate-row">
          <label><span>{t.rate}</span><small>{t.rateHint}</small><input inputMode="decimal" value={rateInput} onChange={(e) => setRateInput(e.target.value)} /></label>
          <button type="button" onClick={saveRate}>{t.saveRate}</button>
        </div>
        <small className="satu-demo-rate">{t.sample}</small>

        <div className="satu-direction">
          <button className={direction === 'sar-to-myr' ? 'active' : ''} onClick={() => setDirection('sar-to-myr')}>{t.toMyr}</button>
          <button className={direction === 'myr-to-sar' ? 'active' : ''} onClick={() => setDirection('myr-to-sar')}>{t.toSar}</button>
        </div>
        <label className="satu-amount"><span>{direction === 'sar-to-myr' ? t.amountSar : t.amountMyr}</span><input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
        <div className="satu-result"><span>{t.result}</span><strong>{direction === 'sar-to-myr' ? `RM ${converted.toFixed(2)}` : `SAR ${converted.toFixed(2)}`}</strong></div>
      </section>

      <section className="satu-tool-card">
        <h2>{t.budget}</h2>
        <div className="satu-budget-grid">
          <label><span>{t.budgetSar}</span><input inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} /></label>
          <label><span>{t.spentSar}</span><input inputMode="decimal" value={spent} onChange={(e) => setSpent(e.target.value)} /></label>
        </div>
        <div className={remaining < 0 ? 'satu-result over' : 'satu-result'}><span>{t.remaining}</span><strong>SAR {remaining.toFixed(2)} <small>≈ RM {(remaining * rate).toFixed(2)}</small></strong></div>
        <button className="satu-full-button" type="button" onClick={saveBudget}>{t.saveBudget}</button>
      </section>

      <section className="satu-tool-card">
        <h2>{t.notes}</h2>
        <p className="lead">{t.notesIntro}</p>
        <form className="satu-note-form" onSubmit={addNote}>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t.notePlaceholder} />
          <button type="submit">{t.addNote}</button>
        </form>
        <div className="satu-note-list">
          {notes.length === 0 && <div className="satu-empty">{t.empty}</div>}
          {notes.map((note) => <article key={note.id}><p>{note.text}</p><button type="button" onClick={() => deleteNote(note.id)}>{t.delete}</button></article>)}
        </div>
        {notes.length > 0 && <button className="satu-clear" type="button" onClick={clearNotes}>{t.clear}</button>}
      </section>
    </section>
  </main>;
}
