import Redis from 'ioredis';
import type { TravelerProfile } from '../types/profile';

const redisUrl = process.env.REDIS_URL || null;

export const redis = new Redis(redisUrl ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: 2,
  lazyConnect: true,
  enableOfflineQueue: false,
  // Fail fast when no real Redis is configured
  connectTimeout: 3000,
});

let _available = false;
let _loggedUnavailable = false;

redis.on('ready', () => {
  _available = true;
  _loggedUnavailable = false;
  console.log('[Redis] Connected');
});
redis.on('close', () => { _available = false; });
redis.on('end',   () => { _available = false; });
redis.on('error', (err) => {
  if (process.env.NODE_ENV === 'test') return;
  _available = false;
  if (!_loggedUnavailable) {
    console.warn('[Redis] Unavailable — session cache disabled:', err.message);
    _loggedUnavailable = true;
  }
});

function ok(): boolean { return _available; }

export function shouldConnect(): boolean { return redisUrl !== null; }

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
