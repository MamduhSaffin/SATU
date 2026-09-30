import type { LocalStore } from '../core/storage/indexedDb';
import { EMERGENCY_PHRASES } from './emergencyPhrases';
import { getArabicVoiceState } from './audio';

export type OfflineSelfTest = {
  storage: boolean;
  phrasePack: boolean;
  serviceWorker: boolean;
  arabicLocalVoice: boolean;
  physicallyOffline: boolean;
  passedCore: boolean;
  completedAt: number;
};

export type OfflinePreparation = {
  controlled: boolean;
  attempted: number;
  cached: boolean;
};

export async function prepareOfflineAppShell(): Promise<OfflinePreparation> {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
    return { controlled: false, attempted: 0, cached: false };
  }

  const resourceUrls = performance
    .getEntriesByType('resource')
    .map((entry) => entry.name)
    .filter((value) => {
      try {
        const url = new URL(value);
        return url.origin === window.location.origin
          && url.pathname.startsWith('/assets/')
          && (url.pathname.endsWith('.js') || url.pathname.endsWith('.css'));
      } catch {
        return false;
      }
    });

  const urls = Array.from(new Set(['/', ...resourceUrls]));
  let attempted = 0;
  for (const url of urls) {
    try {
      attempted += 1;
      await fetch(url, { cache: 'reload' });
    } catch {
      // The verification step below decides whether the shell is actually ready.
    }
  }

  return {
    controlled: true,
    attempted,
    cached: await verifyOfflineAppShell(),
  };
}

export async function runOfflineSelfTest(store: LocalStore): Promise<OfflineSelfTest> {
  const key = 'teman.selftest.roundtrip';
  const token = `ok-${Date.now()}`;
  let storage = false;
  try {
    await store.set(key, token);
    storage = (await store.get<string>(key)) === token;
    await store.remove(key);
  } catch {
    storage = false;
  }

  const phrasePack = EMERGENCY_PHRASES.length >= 5;
  const serviceWorker = await verifyOfflineAppShell();
  const voice = await getArabicVoiceState();
  const physicallyOffline = !navigator.onLine;
  const passedCore = storage && phrasePack && serviceWorker;

  return {
    storage,
    phrasePack,
    serviceWorker,
    arabicLocalVoice: voice.localVoiceAvailable,
    physicallyOffline,
    passedCore,
    completedAt: Date.now(),
  };
}

async function verifyOfflineAppShell(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('caches' in window)) return false;

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return false;

    const cacheNames = await caches.keys();
    const requests: Request[] = [];
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      requests.push(...await cache.keys());
    }

    const paths = requests
      .map((request) => {
        try {
          return new URL(request.url).pathname;
        } catch {
          return '';
        }
      })
      .filter(Boolean);

    const hasShell = paths.includes('/');
    const hasScript = paths.some((path) => path.startsWith('/assets/') && path.endsWith('.js'));
    const hasStyles = paths.some((path) => path.startsWith('/assets/') && path.endsWith('.css'));

    return hasShell && hasScript && hasStyles;
  } catch {
    return false;
  }
}
