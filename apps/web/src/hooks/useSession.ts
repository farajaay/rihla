import { useCallback } from 'react';
import { useSessionStore } from '../stores/sessionStore';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

export function useSession() {
  const {
    sessionId,
    consentGiven,
    deviceMeta,
    setSessionId,
    setConsent,
    clearSession,
  } = useSessionStore();

  const createSession = useCallback(async (withConsent: boolean): Promise<string> => {
    const res = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceType: deviceMeta.deviceType,
        browserLanguage: deviceMeta.browserLanguage,
        timezone: deviceMeta.timezone,
        referralSource: deviceMeta.referralSource,
        consentGiven: withConsent,
      }),
    });

    if (!res.ok) throw new Error('Failed to create session');

    const { sessionId: id } = await res.json() as { sessionId: string };
    setSessionId(id);
    setConsent(withConsent);
    return id;
  }, [deviceMeta, setSessionId, setConsent]);

  const grantConsent = useCallback(async (): Promise<void> => {
    if (!sessionId) return;
    await fetch(`${API_BASE}/sessions/${sessionId}/consent`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consentGiven: true }),
    });
    setConsent(true);
  }, [sessionId, setConsent]);

  const deleteSession = useCallback(async (): Promise<void> => {
    if (!sessionId) return;
    await fetch(`${API_BASE}/sessions/${sessionId}`, { method: 'DELETE' });
    clearSession();
  }, [sessionId, clearSession]);

  return { sessionId, consentGiven, createSession, grantConsent, deleteSession };
}
