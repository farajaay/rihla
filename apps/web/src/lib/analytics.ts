// Thin PostHog wrapper. No-op when VITE_POSTHOG_KEY is missing.

let initialized = false;
let posthog: { capture: (event: string, props?: Record<string, unknown>) => void; identify: (id: string) => void; reset: () => void } | null = null;

export async function initAnalytics(): Promise<void> {
  if (initialized) return;
  initialized = true;

  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (!key) return;

  try {
    const mod = await import('posthog-js');
    mod.default.init(key, {
      api_host: import.meta.env.VITE_POSTHOG_HOST ?? 'https://app.posthog.com',
      capture_pageview: true,
      person_profiles: 'identified_only',
    });
    posthog = mod.default as unknown as typeof posthog;
  } catch (err) {
    console.warn('[Analytics] posthog-js not installed:', (err as Error).message);
  }
}

export function track(event: string, props?: Record<string, unknown>): void {
  posthog?.capture(event, props);
}

export function identify(sessionId: string): void {
  posthog?.identify(sessionId);
}

export function resetAnalytics(): void {
  posthog?.reset();
}
