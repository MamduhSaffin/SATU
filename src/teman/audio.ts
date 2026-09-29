export type ArabicVoiceState = {
  supported: boolean;
  localVoiceAvailable: boolean;
  voiceName?: string;
};

export type ArabicPlaybackResult = {
  played: boolean;
  offlineCapable: boolean;
  voiceName?: string;
  reason?: 'unsupported' | 'started' | 'ended' | 'error' | 'timeout';
};

let cachedVoices: SpeechSynthesisVoice[] = [];
let activeUtterance: SpeechSynthesisUtterance | null = null;
let activeTimeout: number | undefined;

function refreshVoiceCache(): SpeechSynthesisVoice[] {
  if (!('speechSynthesis' in window)) return [];
  const voices = window.speechSynthesis.getVoices();
  if (voices.length) cachedVoices = voices;
  return cachedVoices;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  refreshVoiceCache();
  window.speechSynthesis.addEventListener('voiceschanged', refreshVoiceCache);
}

function waitForVoices(timeoutMs = 3000): Promise<SpeechSynthesisVoice[]> {
  if (!('speechSynthesis' in window)) return Promise.resolve([]);
  const current = refreshVoiceCache();
  if (current.length) return Promise.resolve(current);

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.speechSynthesis.removeEventListener('voiceschanged', finish);
      resolve(refreshVoiceCache());
    };
    window.speechSynthesis.addEventListener('voiceschanged', finish, { once: true });
    window.setTimeout(finish, timeoutMs);
  });
}

function selectArabicVoice(): SpeechSynthesisVoice | undefined {
  const voices = refreshVoiceCache();
  const arabic = voices.filter((voice) => voice.lang.toLowerCase().startsWith('ar'));
  return arabic.find((voice) => voice.localService) ?? arabic[0];
}

export async function getArabicVoiceState(): Promise<ArabicVoiceState> {
  if (!('speechSynthesis' in window)) {
    return { supported: false, localVoiceAvailable: false };
  }
  const voices = await waitForVoices();
  const arabic = voices.filter((voice) => voice.lang.toLowerCase().startsWith('ar'));
  const selected = arabic.find((voice) => voice.localService) ?? arabic[0];
  return {
    supported: true,
    localVoiceAvailable: Boolean(selected?.localService),
    voiceName: selected?.name,
  };
}

function clearActiveUtterance() {
  if (activeTimeout !== undefined) {
    window.clearTimeout(activeTimeout);
    activeTimeout = undefined;
  }
  activeUtterance = null;
}

/**
 * Mobile-safe Arabic speech playback.
 *
 * Safari/iOS can silently stop speech when the utterance object is garbage
 * collected. Keep a module-level reference until playback actually ends.
 * We also avoid calling cancel() immediately before every speak(), because
 * that can leave WebKit's speech engine paused on some devices.
 */
export function speakArabic(text: string): Promise<ArabicPlaybackResult> {
  if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
    return Promise.resolve({ played: false, offlineCapable: false, reason: 'unsupported' });
  }

  const synth = window.speechSynthesis;
  const voice = selectArabicVoice();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voice?.lang || 'ar-SA';
  if (voice) utterance.voice = voice;
  utterance.rate = 0.84;
  utterance.pitch = 1;
  utterance.volume = 1;

  // Retain the utterance until onend/onerror to prevent Safari from dropping it.
  activeUtterance = utterance;

  // Only cancel an existing item when something is actually queued/playing.
  if (synth.speaking || synth.pending) synth.cancel();
  if (synth.paused) synth.resume();

  return new Promise((resolve) => {
    let resolved = false;
    const result = (played: boolean, reason: ArabicPlaybackResult['reason']) => {
      if (resolved) return;
      resolved = true;
      resolve({
        played,
        offlineCapable: Boolean(voice?.localService),
        voiceName: voice?.name,
        reason,
      });
    };

    utterance.onstart = () => result(true, 'started');
    utterance.onend = () => {
      result(true, 'ended');
      clearActiveUtterance();
    };
    utterance.onerror = () => {
      result(false, 'error');
      clearActiveUtterance();
    };

    try {
      synth.speak(utterance);

      // WebKit sometimes reports paused after queueing; resume once more without
      // replacing the utterance. This still happens within the original tap flow.
      if (synth.paused) synth.resume();

      activeTimeout = window.setTimeout(() => {
        const active = synth.speaking || synth.pending;
        result(active, active ? 'started' : 'timeout');
        if (!active) clearActiveUtterance();
      }, 1800);
    } catch {
      result(false, 'error');
      clearActiveUtterance();
    }
  });
}
