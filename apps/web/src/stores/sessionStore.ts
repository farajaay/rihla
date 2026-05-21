import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ConversationStage = 'intake' | 'profiling' | 'proposal' | 'booking';

interface SessionState {
  sessionId: string | null;
  consentGiven: boolean;
  profileCompleteness: number;
  stage: ConversationStage;
  adSegments: string[];
  deviceMeta: {
    deviceType: string;
    browserLanguage: string;
    timezone: string;
    referralSource: string;
    idfaRaw?: string;
    gaidRaw?: string;
    fbclid?: string;
    gclid?: string;
    ttclid?: string;
    snapclid?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmContent?: string;
    utmTerm?: string;
  };
  setSessionId: (id: string) => void;
  setConsent: (given: boolean) => void;
  setProfileCompleteness: (value: number) => void;
  setStage: (stage: ConversationStage) => void;
  setAdSegments: (segments: string[]) => void;
  clearSession: () => void;
}

function getDeviceMeta() {
  const p = new URLSearchParams(window.location.search);
  return {
    deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
    browserLanguage: navigator.language ?? 'en',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    referralSource: document.referrer || 'direct',
    // Ad attribution — read once from URL on first load
    idfaRaw:     p.get('idfa')     ?? undefined,
    gaidRaw:     p.get('gaid')     ?? p.get('aaid') ?? undefined,
    fbclid:      p.get('fbclid')   ?? undefined,
    gclid:       p.get('gclid')    ?? undefined,
    ttclid:      p.get('ttclid')   ?? undefined,
    snapclid:    p.get('ScCid')    ?? p.get('snapclid') ?? undefined,
    utmSource:   p.get('utm_source')   ?? undefined,
    utmMedium:   p.get('utm_medium')   ?? undefined,
    utmCampaign: p.get('utm_campaign') ?? undefined,
    utmContent:  p.get('utm_content')  ?? undefined,
    utmTerm:     p.get('utm_term')     ?? undefined,
  };
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      sessionId: null,
      consentGiven: false,
      profileCompleteness: 0,
      stage: 'intake',
      adSegments: [],
      deviceMeta: getDeviceMeta(),
      setSessionId: (id) => set({ sessionId: id }),
      setConsent: (given) => set({ consentGiven: given }),
      setProfileCompleteness: (value) => set({ profileCompleteness: value }),
      setStage: (stage) => set({ stage }),
      setAdSegments: (segments) => set({ adSegments: segments }),
      clearSession: () =>
        set({
          sessionId: null,
          consentGiven: false,
          profileCompleteness: 0,
          stage: 'intake',
          adSegments: [],
        }),
    }),
    {
      name: 'rihla-session',
      partialize: (state) => ({
        sessionId: state.sessionId,
        consentGiven: state.consentGiven,
      }),
    }
  )
);
