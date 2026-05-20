// Lightweight i18n. No runtime dependency.
// To switch language at runtime: setLocale('ar') — also toggles document.dir.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Locale = 'en' | 'ar';

const STRINGS = {
  en: {
    'app.tagline': 'Your AI travel companion',
    'nav.privacy': 'Privacy',
    'nav.terms': 'Terms',
    'nav.newJourney': 'New Journey',
    'consent.heading': 'Before we begin',
    'consent.body': 'We use your conversation to personalize your trip. No name, email, or payment required.',
    'consent.accept': 'I agree',
    'consent.decline': 'Not now',
    'chat.placeholder': 'Tell me about your dream trip…',
    'chat.send': 'Send',
    'chat.stage': 'Stage',
    'chat.messages': 'Messages',
    'itinerary.savePdf': 'Save as PDF',
    'itinerary.back': 'Back to chat',
    'itinerary.book': 'Book this trip',
    'itinerary.generating': 'Building your itinerary',
    'itinerary.generatingSub': 'Crafting every detail just for you…',
    'privacy.title': 'Privacy Policy',
    'privacy.exportButton': 'Download my data',
    'privacy.deleteButton': 'Delete everything',
  },
  ar: {
    'app.tagline': 'رفيق سفرك الذكي',
    'nav.privacy': 'الخصوصية',
    'nav.terms': 'الشروط',
    'nav.newJourney': 'رحلة جديدة',
    'consent.heading': 'قبل أن نبدأ',
    'consent.body': 'نستخدم محادثتك لتخصيص رحلتك. لا حاجة لاسم أو بريد إلكتروني أو دفع.',
    'consent.accept': 'موافق',
    'consent.decline': 'ليس الآن',
    'chat.placeholder': 'أخبرني عن رحلة أحلامك…',
    'chat.send': 'إرسال',
    'chat.stage': 'المرحلة',
    'chat.messages': 'الرسائل',
    'itinerary.savePdf': 'حفظ كملف PDF',
    'itinerary.back': 'العودة إلى المحادثة',
    'itinerary.book': 'احجز هذه الرحلة',
    'itinerary.generating': 'نُجهّز خط سيرك',
    'itinerary.generatingSub': 'نصنع كل تفصيلة من أجلك…',
    'privacy.title': 'سياسة الخصوصية',
    'privacy.exportButton': 'تنزيل بياناتي',
    'privacy.deleteButton': 'حذف كل شيء',
  },
} as const;

export type StringKey = keyof typeof STRINGS.en;

interface LocaleStore {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

export const useLocale = create<LocaleStore>()(
  persist(
    (set) => ({
      locale: detectInitialLocale(),
      setLocale: (locale) => {
        applyDocumentDirection(locale);
        set({ locale });
      },
    }),
    { name: 'rihla-locale' }
  )
);

function detectInitialLocale(): Locale {
  if (typeof navigator === 'undefined') return 'en';
  return navigator.language?.toLowerCase().startsWith('ar') ? 'ar' : 'en';
}

function applyDocumentDirection(locale: Locale): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = locale;
}

export function initI18n(): void {
  applyDocumentDirection(useLocale.getState().locale);
}

export function t(key: StringKey): string {
  const locale = useLocale.getState().locale;
  return STRINGS[locale][key] ?? STRINGS.en[key] ?? key;
}

// React hook variant for components that need to re-render on locale change
export function useT(): (key: StringKey) => string {
  const locale = useLocale((s) => s.locale);
  return (key) => STRINGS[locale][key] ?? STRINGS.en[key] ?? key;
}
