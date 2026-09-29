import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import TemanOfflineApp from './teman/TemanOfflineApp';
import FamilyLinkApp from './teman/FamilyLinkApp';
import FamilyViewApp from './teman/FamilyViewApp';
import './styles.css';

const params = new URLSearchParams(window.location.search);
const app = params.get('app');
const RootApp = app === 'teman-family-view'
  ? FamilyViewApp
  : app === 'teman-family'
    ? FamilyLinkApp
    : app === 'teman'
      ? TemanOfflineApp
      : App;

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>,
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
