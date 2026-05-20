import rateLimit from 'express-rate-limit';

export const chatRateLimit = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '60000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? '30'),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const sessionId = req.headers['x-session-id'] as string;
    return sessionId ?? req.ip ?? 'unknown';
  },
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests. Please slow down.',
    retryAfter: 60,
  },
});

export const sessionRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many sessions created. Please try again later.',
  },
});
