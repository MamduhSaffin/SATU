import type { SupportedLocale } from '../core/i18n';
import { useTemanLocale } from './temanLocale';
import './teman-language.css';

const OPTIONS: Array<{ locale: SupportedLocale; label: string; aria: string }> = [
  { locale: 'ms', label: 'BM', aria: 'Bahasa Melayu' },
  { locale: 'en', label: 'EN', aria: 'English' },
  { locale: 'ar', label: 'العربية', aria: 'العربية' },
];

export default function TemanLanguageSwitcher() {
  const [locale, setLocale] = useTemanLocale();

  return <div className="teman-language-switcher" aria-label="Pilih bahasa / Choose language / اختر اللغة">
    {OPTIONS.map((option) => <button
      key={option.locale}
      type="button"
      className={locale === option.locale ? 'active' : ''}
      aria-label={option.aria}
      aria-pressed={locale === option.locale}
      onClick={() => setLocale(option.locale)}
    >{option.label}</button>)}
  </div>;
}
