import { useEffect, useState } from 'react';
import { directionForLocale, normalizeLocale, type SupportedLocale } from '../core/i18n';

export const TEMAN_LOCALE_KEY = 'teman.locale';
export const TEMAN_LOCALE_EVENT = 'teman-locale-change';

export function readTemanLocale(): SupportedLocale {
  return normalizeLocale(localStorage.getItem(TEMAN_LOCALE_KEY));
}

export function setTemanLocale(locale: SupportedLocale): void {
  localStorage.setItem(TEMAN_LOCALE_KEY, locale);
  document.documentElement.lang = locale === 'ms' ? 'ms' : locale;
  document.documentElement.dir = directionForLocale(locale);
  window.dispatchEvent(new CustomEvent(TEMAN_LOCALE_EVENT, { detail: locale }));
}

export function useTemanLocale(): [SupportedLocale, (locale: SupportedLocale) => void] {
  const [locale, setLocale] = useState<SupportedLocale>(() => readTemanLocale());

  useEffect(() => {
    document.documentElement.lang = locale === 'ms' ? 'ms' : locale;
    document.documentElement.dir = directionForLocale(locale);

    const onLocale = (event: Event) => {
      const next = normalizeLocale((event as CustomEvent<string>).detail);
      setLocale(next);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === TEMAN_LOCALE_KEY) setLocale(normalizeLocale(event.newValue));
    };

    window.addEventListener(TEMAN_LOCALE_EVENT, onLocale);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(TEMAN_LOCALE_EVENT, onLocale);
      window.removeEventListener('storage', onStorage);
    };
  }, [locale]);

  return [locale, setTemanLocale];
}
