import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import TemanOfflineApp from './teman/TemanOfflineApp';
import './styles.css';

const params = new URLSearchParams(window.location.search);
const RootApp = params.get('app') === 'teman' ? TemanOfflineApp : App;

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>,
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
