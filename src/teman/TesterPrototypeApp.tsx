import { useState } from 'react';
import { resetTemanPrototypeData, seedTemanDemoData } from './demoData';
import './teman-tester.css';

const TEST_SCENARIOS = [
  ['1', 'Sesat / terpisah', 'Buka Crisis Mode → SAYA SESAT / TERPISAH → semak peta, kad keselamatan dan kontak.'],
  ['2', 'Tidak sihat', 'Buka Crisis Mode → SAYA TAK SIHAT → semak 997, 911 dan 937. Jangan buat panggilan sebenar semasa demo.'],
  ['3', 'Balik ke hotel', 'Buka BALIK KE HOTEL → semak HOTEL / ANDA, jarak, peta jalan dan fallback kompas.'],
  ['4', 'Offline', 'Sediakan app + peta dahulu, kemudian Airplane Mode → semak kad, data trip, frasa, GPS dan peta yang telah dimuat turun.'],
  ['5', 'Kandungan', 'Semak Ibadah, Terjemah, Peringatan dan Family Link. Catat apa yang mengelirukan atau terlalu kecil.'],
] as const;

export default function TesterPrototypeApp() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function startDemo() {
    setBusy(true);
    setMessage('Menyediakan data demo…');
    try {
      await seedTemanDemoData();
      window.location.href = '/?app=teman';
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Tidak dapat menyediakan data demo.');
      setBusy(false);
    }
  }

  async function resetDemo() {
    setBusy(true);
    try {
      await resetTemanPrototypeData();
      setMessage('Data TEMAN pada peranti ini telah dikosongkan.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Reset gagal.');
    } finally {
      setBusy(false);
    }
  }

  return <main className="tester-app">
    <header className="tester-topbar">
      <div><strong>TEMAN Haramain</strong><span> by <b>TGPU</b></span></div>
      <div className="tester-version">PROTOTYPE v1.2</div>
    </header>

    <section className="tester-hero">
      <div className="tester-kicker">Tester Preview • Malaysia-first • Hajj & Umrah</div>
      <h1>Teman ketika jemaah paling perlukan bantuan.</h1>
      <p>TEMAN ialah prototaip aplikasi keselamatan dan bantuan jemaah yang direka supaya warga emas dan pengguna kali pertama boleh bertindak dengan satu atau dua tekanan sahaja — termasuk ketika internet tiada.</p>
      <div className="tester-primary-actions">
        <button className="tester-start" onClick={() => void startDemo()} disabled={busy}>
          {busy ? 'MENYEDIAKAN…' : 'MULA DEMO DENGAN DATA CONTOH'}
          <span>Paling sesuai untuk penguji dan pembentangan institusi</span>
        </button>
        <button onClick={() => { window.location.href = '/?app=teman-ready'; }}>
          SEDIAKAN DATA SENDIRI
          <span>Family Setup + Travel Ready</span>
        </button>
      </div>
      {message && <div className="tester-message">{message}</div>}
    </section>

    <section className="tester-section">
      <h2>Apa yang sudah boleh diuji</h2>
      <div className="tester-feature-grid">
        <Feature title="Crisis Mode" text="Sesat, sakit, bas/kumpulan, hotel, kad keselamatan dan panggilan pantas." />
        <Feature title="Peta Haramain" text="Makkah & Madinah street map, GPS, hotel, meeting point dan fallback kompas offline." />
        <Feature title="Travel Ready" text="Family Setup, safety card, app-cache test dan persediaan sebelum berlepas." />
        <Feature title="Family Link" text="Lapisan keluarga berasingan daripada fungsi kecemasan asas." />
        <Feature title="Terjemah" text="BM / العربية / English dengan frasa kecemasan yang dibundel." />
        <Feature title="Ibadah" text="Pack Umrah Malaysia berasaskan sumber TH, dengan status semakan dipaparkan secara jelas." />
        <Feature title="Peringatan" text="Ubat, air dan tugasan ringkas yang boleh disediakan sebelum perjalanan." />
        <Feature title="Belanja & Kira" text="Alat kira/belanja berasaskan SATU untuk penggunaan praktikal di Haramain." />
      </div>
    </section>

    <section className="tester-section tester-script">
      <h2>Skrip ujian 10–15 minit</h2>
      <p className="tester-muted">Kami mahu tahu sama ada seorang jemaah yang cemas atau warga emas boleh memahami apa yang perlu ditekan tanpa penerangan panjang.</p>
      <div className="tester-scenarios">
        {TEST_SCENARIOS.map(([number, title, text]) => <article key={number}>
          <div className="tester-step">{number}</div>
          <div><strong>{title}</strong><p>{text}</p></div>
        </article>)}
      </div>
    </section>

    <section className="tester-section tester-integrity">
      <h2>Status prototaip</h2>
      <p><strong>Ini bukan aplikasi rasmi Tabung Haji, Nusuk atau Kerajaan Arab Saudi.</strong> Ia ialah prototaip TGPU untuk penilaian pengguna dan perbincangan kerjasama.</p>
      <p>Kandungan ibadah dan frasa Arab yang belum mendapat semakan akhir manusia dilabel dengan jelas. Data contoh ialah data rekaan. Penguji tidak perlu memasukkan nombor pasport, akaun bank atau maklumat sensitif.</p>
    </section>

    <section className="tester-section tester-footer-actions">
      <button onClick={() => { window.location.href = '/?app=teman'; }}>BUKA MOD JEMAAH</button>
      <button onClick={() => { window.location.href = '/?app=teman-emergency'; }}>BUKA CRISIS MODE</button>
      <button onClick={() => { window.location.href = '/?app=teman-feedback'; }}>BERI MAKLUM BALAS</button>
      <button className="tester-reset" onClick={() => void resetDemo()} disabled={busy}>RESET DATA PROTOTYPE</button>
    </section>
  </main>;
}

function Feature({ title, text }: { title: string; text: string }) {
  return <article className="tester-feature"><strong>{title}</strong><p>{text}</p></article>;
}
