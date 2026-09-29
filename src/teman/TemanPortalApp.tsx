import TemanOfflineApp from './TemanOfflineApp';
import './teman-reminders.css';

export default function TemanPortalApp() {
  return <div className="teman-portal">
    <TemanOfflineApp />
    <nav className="teman-portal-nav" aria-label="TEMAN quick tools">
      <button className="family" onClick={() => { window.location.href = '/?app=teman-family'; }}>
        FAMILY LINK
      </button>
      <button className="translate" onClick={() => { window.location.href = '/?app=teman-translate'; }}>
        TERJEMAH
      </button>
      <button className="reminders" onClick={() => { window.location.href = '/?app=teman-reminders'; }}>
        PERINGATAN
      </button>
    </nav>
  </div>;
}
