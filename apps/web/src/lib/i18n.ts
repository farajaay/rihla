// Lightweight i18n. No runtime dependency.
// To switch language at runtime: setLocale('ar') — also toggles document.dir.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Locale = 'en' | 'ar';

const STRINGS = {
  en: {
    // App / nav
    'app.tagline': 'Your AI travel companion',
    'nav.privacy': 'Privacy',
    'nav.terms': 'Terms',
    'nav.pricing': 'Pricing',
    'nav.newJourney': 'New Journey',

    // Consent banner
    'consent.heading': 'Before we begin',
    'consent.body': 'We use your conversation to personalize your trip. No name, email, or payment required.',
    'consent.accept': 'I agree',
    'consent.decline': 'Not now',
    'consent.bannerHeading': 'We personalize your experience',
    'consent.bannerBody': 'Rihla uses session data to tailor travel recommendations for you. No personal data is sold. You can delete your data anytime.',
    'consent.acceptFull': 'Accept & Continue',
    'consent.declineFull': 'Decline',

    // Landing
    'landing.badge': 'AI-Powered Travel Planning',
    'landing.cta': 'Start Planning',
    'landing.ctaLoading': 'Starting your journey...',
    'landing.tagline': 'Tell Rihla where you dream of going. She listens, understands, and builds the trip of your life.',
    'landing.noTrackingNote': 'We respect your choice. Limited personalization will be available without data collection.',
    'landing.continueWithout': 'Continue without tracking',

    // Chat
    'chat.placeholder': 'Tell me about your dream trip…',
    'chat.send': 'Send',
    'chat.stage': 'Stage',
    'chat.messages': 'Messages',
    'chat.sessionLabel': 'Session',
    'chat.thinking': 'Thinking...',
    'chat.consultant': 'AI Travel Consultant',
    'chat.readyToPropose': 'Ready to propose',
    'chat.buildingProfile': 'Building your profile',
    'chat.emptyHeading': 'Where would you like to go?',
    'chat.emptyBody': "Tell me about your dream destination and I'll craft a personalized journey just for you.",
    'chat.enterHint': 'Press Enter to send · Shift+Enter for new line',

    // Itinerary
    'itinerary.savePdf': 'Save as PDF',
    'itinerary.back': 'Back to chat',
    'itinerary.book': 'Book this trip',
    'itinerary.generating': 'Building your itinerary',
    'itinerary.generatingSub': 'Crafting every detail just for you…',
    'itinerary.personalizedJourney': 'Your Personalized Journey',
    'itinerary.highlights': 'Journey Highlights',
    'itinerary.dayByDay': 'Day by Day',
    'itinerary.practicalInfo': 'Practical Information',
    'itinerary.estCost': 'est. cost',
    'itinerary.noteLabel': 'A note from Rihla',
    'itinerary.morning': 'Morning',
    'itinerary.afternoon': 'Afternoon',
    'itinerary.evening': 'Evening',
    'itinerary.refining': 'Refining your itinerary',
    'itinerary.refiningSub': 'Reworking the details just for you…',
    'itinerary.loading': 'Loading your itinerary…',
    'itinerary.notFound': 'Itinerary not found.',
    'itinerary.prevVersion': '← previous version',
    'itinerary.refinedFrom': 'Refined from:',

    // Budget tiers
    'budget.lean': 'Budget',
    'budget.balanced': 'Mid-range',
    'budget.premium': 'Premium',
    'budget.ultra': 'Ultra-luxury',

    // Practical info labels
    'info.bestTime': 'Best Time to Visit',
    'info.visa': 'Visa for Saudi Passport',
    'info.currency': 'Currency',
    'info.language': 'Language',
    'info.gettingThere': 'Getting There',
    'info.tips': 'Travel Tips',

    // Privacy
    'privacy.title': 'Privacy Policy',
    'privacy.exportButton': 'Download my data',
    'privacy.deleteButton': 'Delete everything',
    'privacy.back': '← Back',
    'privacy.pdplNote': 'PDPL-aligned · Last updated 2026-05-20',
    'privacy.sessionLabel': 'Session:',
    'privacy.noSession': 'Start a session on the home page first.',
    'privacy.preparing': 'Preparing…',
    'privacy.deleting': 'Deleting…',
    'privacy.s1': 'What we collect',
    'privacy.s2': 'How we use it',
    'privacy.s3': 'Your rights',
    'privacy.s4': 'Third parties',
    'privacy.s5': 'Contact',

    // Refinement bar
    'refine.placeholder': "Refine your itinerary — e.g. 'make it cheaper' or 'add a beach day'",
    'refine.chip.budget': 'Make it more budget-friendly',
    'refine.chip.beach': 'Swap day 3 for a beach day',
    'refine.chip.luxury': 'Add a luxury dinner experience',
    'refine.chip.extend': 'Extend the trip by 2 days',
    'refine.chip.halal': 'Add halal-friendly dining options',

    // Terms
    'terms.title': 'Terms of Service',
    'terms.lastUpdated': 'Last updated 2026-05-20',

    // Pricing
    'pricing.title': 'Pricing',
    'pricing.tagline': 'Free to plan. Pay when you book.',
  },
  ar: {
    // App / nav
    'app.tagline': 'رفيق سفرك الذكي',
    'nav.privacy': 'الخصوصية',
    'nav.terms': 'الشروط',
    'nav.pricing': 'الأسعار',
    'nav.newJourney': 'رحلة جديدة',

    // Consent banner
    'consent.heading': 'قبل أن نبدأ',
    'consent.body': 'نستخدم محادثتك لتخصيص رحلتك. لا حاجة لاسم أو بريد إلكتروني أو دفع.',
    'consent.accept': 'موافق',
    'consent.decline': 'ليس الآن',
    'consent.bannerHeading': 'نُخصّص تجربتك',
    'consent.bannerBody': 'تستخدم رِحلة بيانات الجلسة لتخصيص توصيات السفر لك. لا يُباع أي بيانات شخصية. يمكنك حذف بياناتك في أي وقت.',
    'consent.acceptFull': 'قبول والمتابعة',
    'consent.declineFull': 'رفض',

    // Landing
    'landing.badge': 'تخطيط السفر بالذكاء الاصطناعي',
    'landing.cta': 'ابدأ التخطيط',
    'landing.ctaLoading': 'نبدأ رحلتك...',
    'landing.tagline': 'أخبر رِحلة عن وجهتك التي تحلم بها. تستمع، وتفهم، وتصنع رحلة عمرك.',
    'landing.noTrackingNote': 'نحترم اختيارك. ستتوفر تخصيصات محدودة بدون جمع البيانات.',
    'landing.continueWithout': 'المتابعة بدون تتبع',

    // Chat
    'chat.placeholder': 'أخبرني عن رحلة أحلامك…',
    'chat.send': 'إرسال',
    'chat.stage': 'المرحلة',
    'chat.messages': 'الرسائل',
    'chat.sessionLabel': 'الجلسة',
    'chat.thinking': 'أفكر...',
    'chat.consultant': 'مستشار سفر ذكي',
    'chat.readyToPropose': 'جاهز للاقتراح',
    'chat.buildingProfile': 'نبني ملفك',
    'chat.emptyHeading': 'إلى أين تريد السفر؟',
    'chat.emptyBody': 'أخبرني عن وجهتك المثالية وسأصمم رحلة مخصصة لك.',
    'chat.enterHint': 'Enter للإرسال · Shift+Enter لسطر جديد',

    // Itinerary
    'itinerary.savePdf': 'حفظ كملف PDF',
    'itinerary.back': 'العودة إلى المحادثة',
    'itinerary.book': 'احجز هذه الرحلة',
    'itinerary.generating': 'نُجهّز خط سيرك',
    'itinerary.generatingSub': 'نصنع كل تفصيلة من أجلك…',
    'itinerary.personalizedJourney': 'رحلتك المخصصة',
    'itinerary.highlights': 'أبرز ما في الرحلة',
    'itinerary.dayByDay': 'يوماً بيوم',
    'itinerary.practicalInfo': 'معلومات عملية',
    'itinerary.estCost': 'التكلفة التقديرية',
    'itinerary.noteLabel': 'ملاحظة من رِحلة',
    'itinerary.morning': 'الصباح',
    'itinerary.afternoon': 'الظهيرة',
    'itinerary.evening': 'المساء',
    'itinerary.refining': 'نُحسّن خط سيرك',
    'itinerary.refiningSub': 'نُعيد صياغة التفاصيل خصيصاً لك…',
    'itinerary.loading': 'جاري تحميل برنامجك السياحي…',
    'itinerary.notFound': 'البرنامج السياحي غير موجود.',
    'itinerary.prevVersion': '← الإصدار السابق',
    'itinerary.refinedFrom': 'مُحسَّن من:',

    // Budget tiers
    'budget.lean': 'اقتصادي',
    'budget.balanced': 'متوسط',
    'budget.premium': 'مميز',
    'budget.ultra': 'فاخر للغاية',

    // Practical info labels
    'info.bestTime': 'أفضل وقت للزيارة',
    'info.visa': 'التأشيرة لجواز السفر السعودي',
    'info.currency': 'العملة',
    'info.language': 'اللغة',
    'info.gettingThere': 'كيفية الوصول',
    'info.tips': 'نصائح السفر',

    // Privacy
    'privacy.title': 'سياسة الخصوصية',
    'privacy.exportButton': 'تنزيل بياناتي',
    'privacy.deleteButton': 'حذف كل شيء',
    'privacy.back': '→ رجوع',
    'privacy.pdplNote': 'متوافق مع نظام PDPL · آخر تحديث 2026-05-20',
    'privacy.sessionLabel': 'الجلسة:',
    'privacy.noSession': 'ابدأ جلسة من الصفحة الرئيسية أولاً.',
    'privacy.preparing': 'جاري التحضير…',
    'privacy.deleting': 'جاري الحذف…',
    'privacy.s1': 'ما نجمعه',
    'privacy.s2': 'كيف نستخدمه',
    'privacy.s3': 'حقوقك',
    'privacy.s4': 'الأطراف الثالثة',
    'privacy.s5': 'التواصل',

    // Refinement bar
    'refine.placeholder': "عدّل برنامجك — مثلاً 'اجعله أوفر' أو 'أضف يوماً على الشاطئ'",
    'refine.chip.budget': 'اجعله أكثر توفيراً',
    'refine.chip.beach': 'استبدل اليوم 3 بيوم شاطئ',
    'refine.chip.luxury': 'أضف تجربة عشاء فاخرة',
    'refine.chip.extend': 'مدّد الرحلة يومين إضافيين',
    'refine.chip.halal': 'أضف خيارات طعام حلال',

    // Terms
    'terms.title': 'شروط الاستخدام',
    'terms.lastUpdated': 'آخر تحديث 2026-05-20',

    // Pricing
    'pricing.title': 'الأسعار',
    'pricing.tagline': 'مجاني للتخطيط. تدفع عند الحجز.',
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
  return (STRINGS[locale] as Record<string, string>)[key] ?? STRINGS.en[key] ?? key;
}

// React hook variant for components that need to re-render on locale change
export function useT(): (key: StringKey) => string {
  const locale = useLocale((s) => s.locale);
  return (key) => (STRINGS[locale] as Record<string, string>)[key] ?? STRINGS.en[key] ?? key;
}
