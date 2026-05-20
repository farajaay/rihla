import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on('error', (err) => {
  if (process.env.NODE_ENV !== 'test') {
    console.error('[Redis] connection error:', err.message);
  }
});

export async function getSessionCache(sessionId: string): Promise<string | null> {
  return redis.get(`session:${sessionId}`);
}

export async function setSessionCache(sessionId: string, data: string, ttlSeconds = 3600): Promise<void> {
  await redis.setex(`session:${sessionId}`, ttlSeconds, data);
}

export async function deleteSessionCache(sessionId: string): Promise<void> {
  await redis.del(`session:${sessionId}`);
}
