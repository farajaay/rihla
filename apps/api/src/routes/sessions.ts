import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import prisma from '../services/db';
import { deleteSessionCache, getCachedProfile } from '../services/redis';
import { sessionRateLimit } from '../middleware/rateLimit';
import { track } from '../services/analytics';
import crypto from 'crypto';

const router = Router();

const CreateSessionSchema = z.object({
  deviceType:      z.string().max(50).optional(),
  browserLanguage: z.string().max(10).optional(),
  timezone:        z.string().max(50).optional(),
  referralSource:  z.string().max(500).optional(),
  consentGiven:    z.boolean().default(false),
  // Advertising attribution — populated from URL params by the frontend
  idfaRaw:     z.string().max(64).optional(),   // iOS IDFA
  gaidRaw:     z.string().max(64).optional(),   // Android GAID / AAID
  fbclid:      z.string().max(250).optional(),  // Facebook Click ID
  gclid:       z.string().max(250).optional(),  // Google Click ID
  ttclid:      z.string().max(250).optional(),  // TikTok Click ID
  snapclid:    z.string().max(250).optional(),  // Snapchat Click ID
  utmSource:   z.string().max(100).optional(),
  utmMedium:   z.string().max(100).optional(),
  utmCampaign: z.string().max(200).optional(),
  utmContent:  z.string().max(200).optional(),
  utmTerm:     z.string().max(200).optional(),
});

router.post('/', sessionRateLimit, async (req: Request, res: Response) => {
  const parse = CreateSessionSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'INVALID_INPUT', details: parse.error.flatten() });
    return;
  }

  const {
    deviceType, browserLanguage, timezone, referralSource, consentGiven,
    idfaRaw, gaidRaw, fbclid, gclid, ttclid, snapclid,
    utmSource, utmMedium, utmCampaign, utmContent, utmTerm,
  } = parse.data;

  const rawIp = req.ip ?? req.socket.remoteAddress ?? '';
  const ipHash = crypto.createHash('sha256').update(rawIp).digest('hex');

  const session = await prisma.session.create({
    data: {
      deviceType, browserLanguage, timezone, referralSource, consentGiven, ipHash,
      idfaRaw, gaidRaw, fbclid, gclid, ttclid, snapclid,
      utmSource, utmMedium, utmCampaign, utmContent, utmTerm,
    },
  });

  void track(session.id, 'session_created', {
    deviceType, browserLanguage, timezone, referralSource, consentGiven,
    utmSource, utmMedium, utmCampaign,
    hasIdfa: !!idfaRaw, hasGaid: !!gaidRaw,
    hasFbclid: !!fbclid, hasGclid: !!gclid, hasTtclid: !!ttclid,
  });

  res.status(201).json({ sessionId: session.id, consentGiven: session.consentGiven });
});

router.patch('/:id/consent', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { consentGiven } = req.body;

  if (typeof consentGiven !== 'boolean') {
    res.status(400).json({ error: 'INVALID_INPUT', message: 'consentGiven must be a boolean' });
    return;
  }

  const session = await prisma.session.update({
    where: { id },
    data: { consentGiven },
  });

  void track(session.id, 'consent_updated', { consentGiven: session.consentGiven });

  res.json({ sessionId: session.id, consentGiven: session.consentGiven });
});

router.get('/:id/export', async (req: Request, res: Response) => {
  const { id } = req.params;

  const session = await prisma.session.findUnique({
    where: { id },
    include: {
      profile: true,
      conversations: { orderBy: { createdAt: 'asc' } },
      itineraries: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!session) {
    res.status(404).json({ error: 'SESSION_NOT_FOUND' });
    return;
  }

  res.setHeader('Content-Disposition', `attachment; filename="rihla-session-${id}.json"`);
  res.json({
    exportedAt: new Date().toISOString(),
    session,
  });
});

router.get('/:id/profile', async (req: Request, res: Response) => {
  const { id } = req.params;

  // Serve from Redis cache first
  const cached = await getCachedProfile(id);
  if (cached) {
    res.json({ sessionId: id, profile: cached, source: 'cache' });
    return;
  }

  const session = await prisma.session.findUnique({
    where: { id },
    include: { profile: true },
  });

  if (!session) {
    res.status(404).json({ error: 'SESSION_NOT_FOUND' });
    return;
  }

  res.json({ sessionId: id, profile: session.profile, source: 'db' });
});

router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const session = await prisma.session.findUnique({ where: { id } });
  if (!session) {
    res.status(404).json({ error: 'SESSION_NOT_FOUND' });
    return;
  }

  await Promise.all([
    prisma.session.delete({ where: { id } }),
    deleteSessionCache(id),
  ]);

  void track(id, 'session_deleted');

  res.json({ message: 'Session and all associated data deleted.' });
});

export default router;
