import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import TemanPortalApp from './teman/TemanPortalApp';
import FamilyLinkApp from './teman/FamilyLinkApp';
import FamilyViewApp from './teman/FamilyViewApp';
import ReminderApp from './teman/ReminderApp';
import TemanTranslateApp from './teman/TemanTranslateApp';
import SafetyNavigationApp from './teman/SafetyNavigationApp';
import OfflineSafetyMapApp from './teman/OfflineSafetyMapApp';
import StreetMapApp from './teman/StreetMapApp';
import TravelReadyApp from './teman/TravelReadyApp';
import EmergencyHubApp from './teman/EmergencyHubApp';
import IbadahGuideApp from './teman/IbadahGuideApp';
import TesterPrototypeApp from './teman/TesterPrototypeApp';
import TesterFeedbackApp from './teman/TesterFeedbackApp';
import TemanLanguageSwitcher from './teman/TemanLanguageSwitcher';
import './styles.css';

const params = new URLSearchParams(window.location.search);
const app = params.get('app');
const RootApp = app === 'teman-family-view'
  ? FamilyViewApp
  : app === 'teman-family'
    ? FamilyLinkApp
    : app === 'teman-reminders'
      ? ReminderApp
      : app === 'teman-translate'
        ? TemanTranslateApp
        : app === 'teman-emergency'
          ? EmergencyHubApp
          : app === 'teman-ibadah'
            ? IbadahGuideApp
            : app === 'teman-ready'
              ? TravelReadyApp
              : app === 'teman-streets'
                ? StreetMapApp
                : app === 'teman-map'
                  ? OfflineSafetyMapApp
                  : app === 'teman-nav'
                    ? SafetyNavigationApp
                    : app === 'teman-preview'
                      ? TesterPrototypeApp
                      : app === 'teman-feedback'
                        ? TesterFeedbackApp
                        : app === 'teman'
                          ? TemanPortalApp
                          : App;

const isTemanRoute = Boolean(app?.startsWith('teman'));

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isTemanRoute && <div className="teman-global-language"><TemanLanguageSwitcher /></div>}
    <RootApp />
  </React.StrictMode>,
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
