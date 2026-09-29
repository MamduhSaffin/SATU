export const SUPPORTED_LOCALES = ['ms', 'ar', 'en'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export type CoreMessageKey =
  | 'offline'
  | 'online'
  | 'syncPending'
  | 'continue'
  | 'back'
  | 'savedOnDevice';

const messages: Record<SupportedLocale, Record<CoreMessageKey, string>> = {
  ms: {
    offline: 'Offline',
    online: 'Online',
    syncPending: 'Menunggu untuk diselaraskan',
    continue: 'Teruskan',
    back: 'Kembali',
    savedOnDevice: 'Disimpan pada telefon ini',
  },
  ar: {
    offline: 'غير متصل',
    online: 'متصل',
    syncPending: 'بانتظار المزامنة',
    continue: 'متابعة',
    back: 'رجوع',
    savedOnDevice: 'محفوظ على هذا الجهاز',
  },
  en: {
    offline: 'Offline',
    online: 'Online',
    syncPending: 'Waiting to sync',
    continue: 'Continue',
    back: 'Back',
    savedOnDevice: 'Saved on this device',
  },
};

export function normalizeLocale(locale?: string | null): SupportedLocale {
  const short = locale?.toLowerCase().split('-')[0];
  return SUPPORTED_LOCALES.includes(short as SupportedLocale)
    ? (short as SupportedLocale)
    : 'ms';
}

export function directionForLocale(locale: SupportedLocale): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

export function coreMessage(locale: SupportedLocale, key: CoreMessageKey): string {
  return messages[locale][key];
}
