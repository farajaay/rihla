// Soft Sentry wrapper for the API. No-op when SENTRY_DSN is missing.

let initialized = false;
let sentry: typeof import('@sentry/node') | null = null;

export async function initSentry(): Promise<void> {
  if (initialized) return;
  initialized = true;

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    console.log('[Sentry] SENTRY_DSN not set — error reporting disabled');
    return;
  }

  try {
    const mod = await import('@sentry/node');
    mod.init({
      dsn,
      environment: process.env.NODE_ENV ?? 'development',
      tracesSampleRate: 0.1,
    });
    sentry = mod;
    console.log('[Sentry] Enabled');
  } catch (err) {
    console.warn('[Sentry] @sentry/node not installed:', (err as Error).message);
  }
}

export function captureException(err: unknown, context?: Record<string, unknown>): void {
  sentry?.captureException(err, { extra: context });
}
