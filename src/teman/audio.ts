export type ArabicVoiceState = {
  supported: boolean;
  localVoiceAvailable: boolean;
  voiceName?: string;
};

let cachedVoices: SpeechSynthesisVoice[] = [];

function refreshVoiceCache(): SpeechSynthesisVoice[] {
  if (!('speechSynthesis' in window)) return [];
  const voices = window.speechSynthesis.getVoices();
  if (voices.length) cachedVoices = voices;
  return cachedVoices;
}

// Prime the voice list as soon as the module loads. On mobile browsers this
// helps keep the later speech call inside the user's original button tap.
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

/**
 * Starts speech immediately inside the caller's tap/click event.
 *
 * Important for iOS/Android browsers: awaiting a voice-list promise before
 * calling speechSynthesis.speak() can lose the user-gesture permission and
 * result in silent playback. If no named Arabic voice is exposed, we still
 * ask the operating system to speak with ar-SA as a fallback.
 */
export function speakArabic(text: string): Promise<{ played: boolean; offlineCapable: boolean }> {
  if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
    return Promise.resolve({ played: false, offlineCapable: false });
  }

  const synth = window.speechSynthesis;
  const voice = selectArabicVoice();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voice?.lang || 'ar-SA';
  if (voice) utterance.voice = voice;
  utterance.rate = 0.86;
  utterance.pitch = 1;
  utterance.volume = 1;

  // Do not wait here: speech must begin during the original user gesture.
  synth.cancel();
  synth.resume();

  return new Promise((resolve) => {
    let settled = false;
    const finish = (played: boolean) => {
      if (settled) return;
      settled = true;
      resolve({ played, offlineCapable: Boolean(voice?.localService) });
    };

    utterance.onstart = () => finish(true);
    utterance.onerror = () => finish(false);
    utterance.onend = () => finish(true);

    try {
      synth.speak(utterance);
      // Some mobile implementations do not fire onstart consistently.
      window.setTimeout(() => finish(synth.speaking || synth.pending), 1200);
    } catch {
      finish(false);
    }
  });
}
