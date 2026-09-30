import { useState } from 'react';
import { resetTemanPrototypeData, seedTemanDemoData } from './demoData';
import { useTemanLocale } from './temanLocale';
import './teman-tester.css';

type TesterCopy = {
  kicker: string; hero: string; intro: string; start: string; preparing: string; startHint: string; ownData: string; ownDataHint: string;
  testable: string; script: string; scriptIntro: string; status: string; statusStrong: string; statusBody: string;
  pilgrimMode: string; crisis: string; feedback: string; reset: string; resetDone: string; resetFail: string; demoFail: string;
  features: Array<[string, string]>; scenarios: Array<[string, string, string]>;
};

const COPY: Record<'ms' | 'en' | 'ar', TesterCopy> = {
  ms: {
    kicker: 'Tester Preview • Malaysia-first • Hajj & Umrah',
    hero: 'Teman ketika jemaah paling perlukan bantuan.',
    intro: 'TEMAN ialah prototaip aplikasi keselamatan dan bantuan jemaah yang direka supaya warga emas dan pengguna kali pertama boleh bertindak dengan satu atau dua tekanan sahaja — termasuk ketika internet tiada.',
    start: 'MULA DEMO DENGAN DATA CONTOH', preparing: 'MENYEDIAKAN…', startHint: 'Paling sesuai untuk penguji dan pembentangan institusi',
    ownData: 'SEDIAKAN DATA SENDIRI', ownDataHint: 'Family Setup + Travel Ready', testable: 'Apa yang sudah boleh diuji',
    script: 'Skrip ujian 10–15 minit', scriptIntro: 'Kami mahu tahu sama ada seorang jemaah yang cemas atau warga emas boleh memahami apa yang perlu ditekan tanpa penerangan panjang.',
    status: 'Status prototaip', statusStrong: 'Ini bukan aplikasi rasmi Tabung Haji, Nusuk atau Kerajaan Arab Saudi.',
    statusBody: 'Ia ialah prototaip TGPU untuk penilaian pengguna dan perbincangan kerjasama. Kandungan ibadah dan frasa Arab yang belum mendapat semakan akhir manusia dilabel dengan jelas. Data contoh ialah data rekaan. Penguji tidak perlu memasukkan nombor pasport, akaun bank atau maklumat sensitif.',
    pilgrimMode: 'BUKA MOD JEMAAH', crisis: 'BUKA CRISIS MODE', feedback: 'BERI MAKLUM BALAS', reset: 'RESET DATA PROTOTYPE',
    resetDone: 'Data TEMAN pada peranti ini telah dikosongkan.', resetFail: 'Reset gagal.', demoFail: 'Tidak dapat menyediakan data demo.',
    features: [
      ['Crisis Mode', 'Sesat, sakit, bas/kumpulan, hotel, kad keselamatan dan panggilan pantas.'],
      ['Peta Haramain', 'Makkah & Madinah street map, GPS, hotel, meeting point dan fallback kompas offline.'],
      ['Travel Ready', 'Family Setup, safety card, app-cache test dan persediaan sebelum berlepas.'],
      ['Family Link', 'Lapisan keluarga berasingan daripada fungsi kecemasan asas.'],
      ['Terjemah', 'BM / العربية / English dengan frasa kecemasan yang dibundel.'],
      ['Ibadah', 'Pack Umrah Malaysia berasaskan sumber TH, dengan status semakan dipaparkan secara jelas.'],
      ['Peringatan', 'Ubat, air dan tugasan ringkas yang boleh disediakan sebelum perjalanan.'],
      ['Belanja & Kira', 'Alat kira/belanja berasaskan SATU untuk penggunaan praktikal di Haramain.'],
    ],
    scenarios: [
      ['1', 'Sesat / terpisah', 'Buka Crisis Mode → SAYA SESAT / TERPISAH → semak peta, kad keselamatan dan kontak.'],
      ['2', 'Tidak sihat', 'Buka Crisis Mode → SAYA TAK SIHAT → semak 997, 911 dan 937. Jangan buat panggilan sebenar semasa demo.'],
      ['3', 'Balik ke hotel', 'Buka BALIK KE HOTEL → semak HOTEL / ANDA, jarak, peta jalan dan fallback kompas.'],
      ['4', 'Offline', 'Sediakan app + peta dahulu, kemudian Airplane Mode → semak kad, data trip, frasa, GPS dan peta yang telah dimuat turun.'],
      ['5', 'Kandungan', 'Semak Ibadah, Terjemah, Peringatan dan Family Link. Catat apa yang mengelirukan atau terlalu kecil.'],
    ],
  },
  en: {
    kicker: 'Tester Preview • Malaysia-first • Hajj & Umrah',
    hero: 'A companion when pilgrims need help most.',
    intro: 'TEMAN is a pilgrim safety and assistance prototype designed so older adults and first-time users can act in one or two taps — including when internet access is unavailable.',
    start: 'START DEMO WITH SAMPLE DATA', preparing: 'PREPARING…', startHint: 'Best for testers and institutional presentations',
    ownData: 'SET UP MY OWN DATA', ownDataHint: 'Family Setup + Travel Ready', testable: 'What can already be tested',
    script: '10–15 minute test script', scriptIntro: 'We want to learn whether a stressed pilgrim or older adult can understand what to tap without a long explanation.',
    status: 'Prototype status', statusStrong: 'This is not an official Tabung Haji, Nusuk, or Saudi Government application.',
    statusBody: 'It is a TGPU prototype for user testing and partnership discussions. Ibadah content and Arabic emergency phrases that still require final human review are clearly labelled. Sample data is fictional. Testers do not need to enter passport, bank, or other sensitive information.',
    pilgrimMode: 'OPEN PILGRIM MODE', crisis: 'OPEN CRISIS MODE', feedback: 'GIVE FEEDBACK', reset: 'RESET PROTOTYPE DATA',
    resetDone: 'TEMAN data on this device has been cleared.', resetFail: 'Reset failed.', demoFail: 'Unable to prepare demo data.',
    features: [
      ['Crisis Mode', 'Lost/separated, unwell, bus/group, hotel, Safety Card, and quick calls.'],
      ['Haramain Maps', 'Makkah & Madinah street maps, GPS, hotel, meeting point, and offline compass fallback.'],
      ['Travel Ready', 'Family Setup, Safety Card, app-cache test, and pre-departure preparation.'],
      ['Family Link', 'A connected family layer that remains separate from core emergency functions.'],
      ['Translate', 'BM / العربية / English with bundled emergency phrases.'],
      ['Ibadah', 'Malaysia Umrah content pack based on TH sources with review status shown clearly.'],
      ['Reminders', 'Medicine, hydration, and simple travel reminders prepared before departure.'],
      ['Shopping & Calculate', 'SATU-powered shopping and calculation tools for practical Haramain use.'],
    ],
    scenarios: [
      ['1', 'Lost / separated', 'Open Crisis Mode → I AM LOST / SEPARATED → check the map, Safety Card, and contacts.'],
      ['2', 'Unwell', 'Open Crisis Mode → I AM UNWELL → check 997, 911, and 937. Do not make a real emergency call during the demo.'],
      ['3', 'Return to hotel', 'Open RETURN TO HOTEL → check HOTEL / YOU, distance, street map, and compass fallback.'],
      ['4', 'Offline', 'Prepare the app + map first, then Airplane Mode → check card, trip data, phrases, GPS, and downloaded map.'],
      ['5', 'Content', 'Review Ibadah, Translate, Reminders, and Family Link. Note anything confusing or too small.'],
    ],
  },
  ar: {
    kicker: 'معاينة للمختبرين • بداية من ماليزيا • الحج والعمرة',
    hero: 'رفيق للحاج والمعتمر عندما تكون المساعدة أهم ما يحتاجه.',
    intro: 'TEMAN نموذج أولي للسلامة والمساعدة صُمم بحيث يستطيع كبار السن والمستخدمون لأول مرة اتخاذ الإجراء المناسب بضغطة أو ضغطتين فقط، حتى عند عدم توفر الإنترنت.',
    start: 'بدء العرض ببيانات تجريبية', preparing: 'جارٍ الإعداد…', startHint: 'مناسب للاختبار والعروض أمام الجهات',
    ownData: 'إعداد بياناتي', ownDataHint: 'إعداد الأسرة + الجاهزية للسفر', testable: 'ما الذي يمكن اختباره الآن',
    script: 'سيناريو اختبار 10–15 دقيقة', scriptIntro: 'نريد معرفة ما إذا كان الحاج أو المعتمر القَلِق أو كبير السن يستطيع معرفة ما يجب الضغط عليه دون شرح طويل.',
    status: 'حالة النموذج الأولي', statusStrong: 'هذا ليس تطبيقًا رسميًا لتابوڠ حاجي أو نسك أو حكومة المملكة العربية السعودية.',
    statusBody: 'إنه نموذج أولي من TGPU لاختبار المستخدمين ومناقشة الشراكات. يتم توضيح حالة أي محتوى تعبدي أو عبارات عربية ما زالت تحتاج إلى مراجعة بشرية نهائية. جميع بيانات العرض وهمية ولا يحتاج المختبر إلى إدخال جواز سفر أو بيانات مصرفية أو معلومات حساسة.',
    pilgrimMode: 'فتح وضع الحاج', crisis: 'فتح وضع الطوارئ', feedback: 'إرسال ملاحظات', reset: 'إعادة ضبط بيانات النموذج',
    resetDone: 'تم مسح بيانات TEMAN من هذا الجهاز.', resetFail: 'تعذر إعادة الضبط.', demoFail: 'تعذر تجهيز بيانات العرض.',
    features: [
      ['وضع الطوارئ', 'الضياع أو الانفصال، المرض، الحافلة أو المجموعة، الفندق، بطاقة السلامة، والاتصال السريع.'],
      ['خرائط الحرمين', 'خرائط شوارع مكة والمدينة، GPS، الفندق، نقطة التجمع، وبوصلة احتياطية تعمل دون إنترنت.'],
      ['الجاهزية للسفر', 'إعداد الأسرة، بطاقة السلامة، اختبار ذاكرة التطبيق، والاستعداد قبل السفر.'],
      ['رابط الأسرة', 'طبقة اتصال للأسرة منفصلة عن وظائف الطوارئ الأساسية.'],
      ['الترجمة', 'BM / العربية / English مع عبارات طوارئ محفوظة في الجهاز.'],
      ['العبادة', 'حزمة عمرة ماليزية مبنية على مصادر TH مع إظهار حالة المراجعة بوضوح.'],
      ['التذكيرات', 'الدواء والماء والمهام البسيطة التي يمكن إعدادها قبل السفر.'],
      ['التسوق والحساب', 'أدوات حساب وتسوق من SATU للاستخدام العملي في الحرمين.'],
    ],
    scenarios: [
      ['1', 'ضائع / منفصل عن المجموعة', 'افتح وضع الطوارئ ← أنا ضائع / منفصل ← راجع الخريطة وبطاقة السلامة وجهات الاتصال.'],
      ['2', 'لست بخير', 'افتح وضع الطوارئ ← لست بخير ← راجع 997 و911 و937. لا تُجرِ اتصال طوارئ حقيقي أثناء العرض.'],
      ['3', 'العودة إلى الفندق', 'افتح العودة إلى الفندق ← راجع الفندق / موقعك والمسافة وخريطة الشوارع والبوصلة الاحتياطية.'],
      ['4', 'دون إنترنت', 'جهّز التطبيق والخريطة أولًا، ثم فعّل وضع الطيران ← راجع البطاقة وبيانات الرحلة والعبارات وGPS والخريطة المحملة.'],
      ['5', 'المحتوى', 'راجع العبادة والترجمة والتذكيرات ورابط الأسرة. سجّل أي شيء غير واضح أو صغير جدًا.'],
    ],
  },
};

export default function TesterPrototypeApp() {
  const [locale] = useTemanLocale();
  const t = COPY[locale];
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function startDemo() {
    setBusy(true);
    setMessage(t.preparing);
    try {
      await seedTemanDemoData();
      window.location.href = '/?app=teman';
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t.demoFail);
      setBusy(false);
    }
  }

  async function resetDemo() {
    setBusy(true);
    try {
      await resetTemanPrototypeData();
      setMessage(t.resetDone);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t.resetFail);
    } finally {
      setBusy(false);
    }
  }

  return <main className="tester-app" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
    <header className="tester-topbar">
      <div><strong>TEMAN Haramain</strong><span> by <b>TGPU</b></span></div>
      <div className="tester-version">PROTOTYPE v1.2</div>
    </header>

    <section className="tester-hero">
      <div className="tester-kicker">{t.kicker}</div>
      <h1>{t.hero}</h1>
      <p>{t.intro}</p>
      <div className="tester-primary-actions">
        <button className="tester-start" onClick={() => void startDemo()} disabled={busy}>
          {busy ? t.preparing : t.start}
          <span>{t.startHint}</span>
        </button>
        <button onClick={() => { window.location.href = '/?app=teman-ready'; }}>
          {t.ownData}
          <span>{t.ownDataHint}</span>
        </button>
      </div>
      {message && <div className="tester-message">{message}</div>}
    </section>

    <section className="tester-section">
      <h2>{t.testable}</h2>
      <div className="tester-feature-grid">
        {t.features.map(([title, text]) => <Feature key={title} title={title} text={text} />)}
      </div>
    </section>

    <section className="tester-section tester-script">
      <h2>{t.script}</h2>
      <p className="tester-muted">{t.scriptIntro}</p>
      <div className="tester-scenarios">
        {t.scenarios.map(([number, title, text]) => <article key={number}>
          <div className="tester-step">{number}</div>
          <div><strong>{title}</strong><p>{text}</p></div>
        </article>)}
      </div>
    </section>

    <section className="tester-section tester-integrity">
      <h2>{t.status}</h2>
      <p><strong>{t.statusStrong}</strong></p>
      <p>{t.statusBody}</p>
    </section>

    <section className="tester-section tester-footer-actions">
      <button onClick={() => { window.location.href = '/?app=teman'; }}>{t.pilgrimMode}</button>
      <button onClick={() => { window.location.href = '/?app=teman-emergency'; }}>{t.crisis}</button>
      <button onClick={() => { window.location.href = '/?app=teman-feedback'; }}>{t.feedback}</button>
      <button className="tester-reset" onClick={() => void resetDemo()} disabled={busy}>{t.reset}</button>
    </section>
  </main>;
}

function Feature({ title, text }: { title: string; text: string }) {
  return <article className="tester-feature"><strong>{title}</strong><p>{text}</p></article>;
}
