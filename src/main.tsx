import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import TemanOfflineApp from './teman/TemanOfflineApp';
import FamilyLinkApp from './teman/FamilyLinkApp';
import FamilyViewApp from './teman/FamilyViewApp';
import './styles.css';

function TemanWithFamilyLink() {
  return <>
    <TemanOfflineApp />
    <button
      type="button"
      aria-label="Buka TEMAN Family Link"
      onClick={() => { window.location.href = '/?app=teman-family'; }}
      style={{
        position: 'fixed',
        right: 12,
        bottom: 'calc(12px + env(safe-area-inset-bottom))',
        zIndex: 30,
        minHeight: 48,
        padding: '0 16px',
        border: 0,
        borderRadius: 24,
        background: '#0B5D3B',
        color: '#fff',
        fontWeight: 800,
        boxShadow: '0 4px 16px rgba(0,0,0,.18)',
      }}
    >
      FAMILY LINK
    </button>
  </>;
}

const params = new URLSearchParams(window.location.search);
const app = params.get('app');
const RootApp = app === 'teman-family-view'
  ? FamilyViewApp
  : app === 'teman-family'
    ? FamilyLinkApp
    : app === 'teman'
      ? TemanWithFamilyLink
      : App;

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>,
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
