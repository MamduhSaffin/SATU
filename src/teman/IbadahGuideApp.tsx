import { useEffect, useState } from 'react';
import { IndexedDbLocalStore } from '../core/storage/indexedDb';
import { UMRAH_MALAYSIA_DRAFT_PACK } from './ibadahContent';
import { TemanRepository } from './repository';
import './teman-offline.css';
import './teman-ibadah.css';

const store = new IndexedDbLocalStore();
const repo = new TemanRepository(store);

export default function IbadahGuideApp() {
  const pack = UMRAH_MALAYSIA_DRAFT_PACK;
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    void repo.updateOfflineAssets({
      ibadahGuide: true,
      ibadahGuideVersion: pack.version,
      ibadahGuideReviewStatus: pack.reviewStatus,
    });
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, [pack.reviewStatus, pack.version]);

  return <main className="teman-app ibadah-app">
    <header className="teman-header">
      <div><strong>TEMAN Haramain</strong><span> by <b>TGPU</b></span></div>
      <div className={online ? 'status online' : 'status offline'}>{online ? 'Online' : 'Offline • kandungan tersimpan'}</div>
    </header>

    <section className="teman-content ibadah-content">
      <button className="back" onClick={() => { window.location.href = '/?app=teman'; }}>← Kembali ke TEMAN</button>

      <div className="ibadah-hero">
        <div className="eyebrow">Panduan Ibadah</div>
        <h1>{pack.title}</h1>
        <p>Ringkasan berstruktur untuk rujukan pantas semasa perjalanan.</p>
        <div className="ibadah-review-badge draft">BELUM SEMAK MANUSIA</div>
      </div>

      <div className="ready-panel warning ibadah-warning">
        <strong>Ini belum kandungan “verified” TEMAN.</strong>
        <p>Sumbernya ialah bahan rasmi Tabung Haji, tetapi salinan/ringkasan dalam TEMAN masih menunggu semakan manusia yang berkelayakan. Ia tidak membuka status OFFLINE READY.</p>
      </div>

      <section className="ibadah-meta">
        <div><span>Versi kandungan</span><strong>{pack.version}</strong></div>
        <div><span>Status</span><strong>DRAF</strong></div>
        <div><span>Semakan sumber</span><strong>{pack.sourceCheckedAt}</strong></div>
        <div><span>Konteks</span><strong>{pack.schoolContext}</strong></div>
      </section>

      <section className="ibadah-steps" aria-label="Ringkasan asas umrah">
        {pack.steps.map((step, index) => <article className="ibadah-step" key={step.id}>
          <div className="ibadah-step-number">{index + 1}</div>
          <div className="ibadah-step-body">
            <div className="ibadah-step-head">
              <div>
                <h2>{step.titleMs}</h2>
                {step.titleAr && <div className="ibadah-arabic" dir="rtl">{step.titleAr}</div>}
              </div>
              <span className={`ibadah-rule ${step.statusLabel.toLowerCase()}`}>{step.statusLabel}</span>
            </div>
            <p>{step.summaryMs}</p>
          </div>
        </article>)}
      </section>

      <section className="ibadah-sources">
        <h2>Sumber rujukan</h2>
        <p>Sumber boleh dibuka apabila internet tersedia. Kandungan ringkas di atas telah dibundel dalam TEMAN supaya boleh dibaca offline.</p>
        {pack.sources.map((source) => <button className="ibadah-source" key={source.url} disabled={!online} onClick={() => { window.location.href = source.url; }}>
          <strong>{source.title}</strong>
          <span>{source.publisher}{online ? ' • Buka sumber rasmi' : ' • Internet diperlukan'}</span>
        </button>)}
      </section>

      <div className="ready-panel warning ibadah-footer-note">
        <strong>Jika ada keraguan tentang hukum atau keadaan peribadi</strong>
        <p>Jangan bergantung pada ringkasan aplikasi. Rujuk pembimbing ibadah, PEKTA/mutawwif atau saluran rasmi yang berautoriti.</p>
      </div>
    </section>
  </main>;
}
