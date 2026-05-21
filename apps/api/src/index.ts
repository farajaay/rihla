console.log('[Startup] index.ts execution started');

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

console.log('[Startup] Express/middleware imports loaded');

import sessionRoutes from './routes/sessions';
import chatRoutes from './routes/chat';
import itineraryRoutes from './routes/itineraries';
import adminRoutes from './routes/admin';

console.log('[Startup] Route imports loaded');

import prisma from './services/db';
import { redis } from './services/redis';
import { shutdownAnalytics } from './services/analytics';
import { initSentry, captureException } from './services/sentry';

console.log('[Startup] Service imports loaded');

const app = express();
const PORT = parseInt(process.env.PORT ?? '3000');
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: [FRONTEND_URL, /\.vercel\.app$/, /\.railway\.app$/],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Id'],
}));

app.use(compression());
app.use(express.json({ limit: '16kb' }));
app.use(cookieParser());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/sessions', sessionRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/itineraries', itineraryRoutes);
app.use('/api/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'NOT_FOUND', path: req.path });
});

app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err);
  captureException(err, { path: req.path, method: req.method });
  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' });
});

async function start() {
  console.log('[Startup] Initializing...');
  try {
    await Promise.race([
      initSentry(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Sentry init timeout')), 5000)),
    ]);
    console.log('[Startup] Sentry initialized');
  } catch (err) {
    console.warn('[Startup] Sentry init skipped:', (err as Error).message);
  }

  console.log('[Startup] Connecting to database...');
  try {
    await prisma.$connect();
    console.log('[Startup] Database connected');
  } catch (err) {
    console.error('[Startup] Failed to connect to PostgreSQL:', err);
    process.exit(1);
  }

  console.log('[Startup] Connecting to Redis...');
  try {
    await Promise.race([
      redis.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Redis connection timeout')), 5000)),
    ]);
    console.log('[Redis] Connected');
  } catch (err) {
    console.warn('[Redis] Unavailable — session cache disabled:', (err as Error).message);
  }

  console.log('[Startup] Starting server...');
  app.listen(PORT, () => {
    console.log(`[API] Rihla API running on http://localhost:${PORT}`);
  });
}

console.log('[Startup] All imports resolved — calling start()');
start();

process.on('SIGTERM', async () => {
  console.log('[Shutdown] SIGTERM received');
  await prisma.$disconnect();
  redis.disconnect();
  await shutdownAnalytics();
  process.exit(0);
});
