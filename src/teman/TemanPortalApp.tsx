import TemanOfflineApp from './TemanOfflineApp';
import './teman-reminders.css';

export default function TemanPortalApp() {
  return <div className="teman-portal">
    <TemanOfflineApp />
    <nav className="teman-portal-nav" aria-label="TEMAN quick safety tools">
      <div className="teman-safety-shortcuts">
        <button className="hotel" onClick={() => { window.location.href = '/?app=teman-streets&target=hotel'; }}>
          <strong>BALIK KE HOTEL</strong>
          <span>Peta terus ke hotel</span>
        </button>
        <button className="group" onClick={() => { window.location.href = '/?app=teman-streets&target=group'; }}>
          <strong>CARI KUMPULAN</strong>
          <span>Meeting point tersimpan</span>
        </button>
      </div>
      <button className="travel-ready-shortcut" onClick={() => { window.location.href = '/?app=teman-ready'; }}>
        <strong>TRAVEL READY</strong>
        <span>Keluarga sediakan & uji offline sebelum berlepas</span>
      </button>
      <div className="teman-tool-grid">
        <button className="family" onClick={() => { window.location.href = '/?app=teman-family'; }}>FAMILY LINK</button>
        <button className="navigate" onClick={() => { window.location.href = '/?app=teman-streets'; }}>PETA</button>
        <button className="translate" onClick={() => { window.location.href = '/?app=teman-translate'; }}>TERJEMAH</button>
        <button className="reminders" onClick={() => { window.location.href = '/?app=teman-reminders'; }}>PERINGATAN</button>
      </div>
    </nav>
  </div>;
}
