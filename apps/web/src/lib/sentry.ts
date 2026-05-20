// Soft Sentry wrapper. No-op when VITE_SENTRY_DSN is missing.

let initialized = false;
let sentry: typeof import('@sentry/react') | null = null;

export async function initSentry(): Promise<void> {
  if (initialized) return;
  initialized = true;

  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  try {
    const mod = await import('@sentry/react');
    mod.init({
      dsn,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0.1,
    });
    sentry = mod;
  } catch (err) {
    console.warn('[Sentry] @sentry/react not installed:', (err as Error).message);
  }
}

export function captureException(err: unknown, context?: Record<string, unknown>): void {
  sentry?.captureException(err, { extra: context });
}

export function setUser(sessionId: string | null): void {
  sentry?.setUser(sessionId ? { id: sessionId } : null);
}
