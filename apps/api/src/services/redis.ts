import Redis from 'ioredis';
import type { TravelerProfile } from '../types/profile';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 2,
  lazyConnect: true,
  enableOfflineQueue: false,
});

redis.on('error', (err) => {
  if (process.env.NODE_ENV !== 'test') {
    console.warn('[Redis] error:', err.message);
  }
});

let _available = false;
redis.on('ready', () => { _available = true; });
redis.on('close', () => { _available = false; });
redis.on('end',   () => { _available = false; });

function ok(): boolean { return _available; }

// ── Profile cache ─────────────────────────────────────────────────────────

const PROFILE_TTL = 60 * 60 * 2; // 2 hours
const CONV_TTL    = 60 * 60 * 4; // 4 hours

const profileKey = (sid: string) => `profile:${sid}`;
const convKey    = (sid: string) => `conv:${sid}`;

export async function getCachedProfile(sessionId: string): Promise<Partial<TravelerProfile> | null> {
  if (!ok()) return null;
  try {
    const raw = await redis.get(profileKey(sessionId));
    return raw ? (JSON.parse(raw) as Partial<TravelerProfile>) : null;
  } catch { return null; }
}

export async function setCachedProfile(sessionId: string, profile: Partial<TravelerProfile>): Promise<void> {
  if (!ok()) return;
  try { await redis.setex(profileKey(sessionId), PROFILE_TTL, JSON.stringify(profile)); }
  catch { /* cache miss is acceptable */ }
}

export async function invalidateProfile(sessionId: string): Promise<void> {
  if (!ok()) return;
  try { await redis.del(profileKey(sessionId)); } catch { /* noop */ }
}

// ── Conversation history cache ────────────────────────────────────────────

export interface CachedMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function getCachedConversation(sessionId: string): Promise<CachedMessage[] | null> {
  if (!ok()) return null;
  try {
    const raw = await redis.get(convKey(sessionId));
    return raw ? (JSON.parse(raw) as CachedMessage[]) : null;
  } catch { return null; }
}

export async function setCachedConversation(sessionId: string, messages: CachedMessage[]): Promise<void> {
  if (!ok()) return;
  try { await redis.setex(convKey(sessionId), CONV_TTL, JSON.stringify(messages)); }
  catch { /* noop */ }
}

export async function appendToConversationCache(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<void> {
  if (!ok()) return;
  try {
    const existing = await getCachedConversation(sessionId);
    await setCachedConversation(sessionId, [...(existing ?? []), { role, content }]);
  } catch { /* noop */ }
}

// ── Cleanup ───────────────────────────────────────────────────────────────

export async function deleteSessionCache(sessionId: string): Promise<void> {
  if (!ok()) return;
  try { await redis.del(profileKey(sessionId), convKey(sessionId)); }
  catch { /* noop */ }
}
