import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SessionState {
  sessionId: string | null;
  consentGiven: boolean;
  profileCompleteness: number;
  stage: 'intake' | 'profiling' | 'proposal' | 'booking';
  adSegments: string[];
  deviceMeta: {
    deviceType: string;
    browserLanguage: string;
    timezone: string;
    referralSource: string;
  };
  setSessionId: (id: string) => void;
  setConsent: (given: boolean) => void;
  setProfileCompleteness: (value: number) => void;
  setStage: (stage: SessionState['stage']) => void;
  setAdSegments: (segments: string[]) => void;
  clearSession: () => void;
}

function getDeviceMeta() {
  return {
    deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
    browserLanguage: navigator.language ?? 'en',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    referralSource: document.referrer ?? 'direct',
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
