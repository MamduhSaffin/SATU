export type ArabicVoiceState = {
  supported: boolean;
  localVoiceAvailable: boolean;
  voiceName?: string;
};

function waitForVoices(timeoutMs = 1200): Promise<SpeechSynthesisVoice[]> {
  if (!('speechSynthesis' in window)) return Promise.resolve([]);
  const current = window.speechSynthesis.getVoices();
  if (current.length) return Promise.resolve(current);

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.speechSynthesis.removeEventListener('voiceschanged', finish);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener('voiceschanged', finish, { once: true });
    window.setTimeout(finish, timeoutMs);
  });
}

export async function getArabicVoiceState(): Promise<ArabicVoiceState> {
  if (!('speechSynthesis' in window)) {
    return { supported: false, localVoiceAvailable: false };
  }
  const voices = await waitForVoices();
  const arabic = voices.filter((voice) => voice.lang.toLowerCase().startsWith('ar'));
  const local = arabic.find((voice) => voice.localService) ?? arabic[0];
  return {
    supported: true,
    localVoiceAvailable: Boolean(local?.localService),
    voiceName: local?.name,
  };
}

export async function speakArabic(text: string): Promise<{ played: boolean; offlineCapable: boolean }> {
  if (!('speechSynthesis' in window)) return { played: false, offlineCapable: false };
  const voices = await waitForVoices();
  const arabic = voices.filter((voice) => voice.lang.toLowerCase().startsWith('ar'));
  const voice = arabic.find((item) => item.localService) ?? arabic[0];
  if (!voice) return { played: false, offlineCapable: false };

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voice.lang || 'ar-SA';
  utterance.voice = voice;
  utterance.rate = 0.86;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
  return { played: true, offlineCapable: voice.localService };
}
