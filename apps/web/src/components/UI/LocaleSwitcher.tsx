import { useLocale } from '../../lib/i18n';

export default function LocaleSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <button
      onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
      className="text-rihla-muted hover:text-rihla-text text-xs uppercase tracking-widest transition"
      aria-label="Toggle language"
    >
      {locale === 'en' ? 'العربية' : 'English'}
    </button>
  );
}
