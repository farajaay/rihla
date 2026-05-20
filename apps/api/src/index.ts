import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

import sessionRoutes from './routes/sessions';
import chatRoutes from './routes/chat';
import itineraryRoutes from './routes/itineraries';
import prisma from './services/db';
import { redis } from './services/redis';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3000');
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: [FRONTEND_URL, /\.netlify\.app$/, /\.railway\.app$/],
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

app.use((req, res) => {
  res.status(404).json({ error: 'NOT_FOUND', path: req.path });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' });
});

async function start() {
  try {
    await prisma.$connect();
    console.log('[DB] Connected to PostgreSQL');

    await redis.connect();
    console.log('[Redis] Connected');

    app.listen(PORT, () => {
      console.log(`[API] Rihla API running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[Startup] Failed to connect to infrastructure:', err);
    process.exit(1);
  }
}

start();

process.on('SIGTERM', async () => {
  console.log('[Shutdown] SIGTERM received');
  await prisma.$disconnect();
  redis.disconnect();
  process.exit(0);
});
