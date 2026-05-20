// Lightweight PostHog wrapper. Becomes a no-op when POSTHOG_API_KEY isn't set,
// so dev environments don't need to install or configure analytics.

type Properties = Record<string, unknown>;

interface Client {
  capture(args: { distinctId: string; event: string; properties?: Properties }): void;
  shutdown(): Promise<void>;
}

let client: Client | null = null;
let initialized = false;

async function init(): Promise<Client | null> {
  if (initialized) return client;
  initialized = true;

  const key = process.env.POSTHOG_API_KEY;
  if (!key) {
    console.log('[Analytics] POSTHOG_API_KEY not set — events disabled');
    return null;
  }

  try {
    const mod = (await import('posthog-node')) as { PostHog: new (k: string, opts: { host?: string }) => Client };
    client = new mod.PostHog(key, { host: process.env.POSTHOG_HOST ?? 'https://app.posthog.com' });
    console.log('[Analytics] PostHog enabled');
    return client;
  } catch (err) {
    console.warn('[Analytics] posthog-node not installed — events disabled:', (err as Error).message);
    return null;
  }
}

export async function track(sessionId: string, event: string, properties?: Properties): Promise<void> {
  const c = await init();
  if (!c) return;
  try {
    c.capture({ distinctId: sessionId, event, properties });
  } catch (err) {
    console.warn('[Analytics] capture failed:', (err as Error).message);
  }
}

export async function shutdownAnalytics(): Promise<void> {
  if (client) await client.shutdown();
}
