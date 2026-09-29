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
  let serviceWorker = false;
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      serviceWorker = Boolean(registration);
    } catch {
      serviceWorker = false;
    }
  }

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
