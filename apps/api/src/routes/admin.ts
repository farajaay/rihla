import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import prisma from '../services/db';
import { adminAuth } from '../middleware/adminAuth';

const router = Router();

router.use(adminAuth);

router.get('/metrics', async (_req: Request, res: Response) => {
  const [sessionCount, consented, itineraryCount, profileCount] = await Promise.all([
    prisma.session.count(),
    prisma.session.count({ where: { consentGiven: true } }),
    prisma.itinerary.count(),
    prisma.travelerProfile.count(),
  ]);

  const archetypes = await prisma.travelerProfile.groupBy({
    by: ['travelArchetype'],
    _count: { _all: true },
    orderBy: { _count: { travelArchetype: 'desc' } },
  });

  const budgetTiers = await prisma.travelerProfile.groupBy({
    by: ['budgetTier'],
    _count: { _all: true },
    orderBy: { _count: { budgetTier: 'desc' } },
  });

  // Top destinations — unnest the string[] in raw SQL for accuracy
  const topDestinations = await prisma.$queryRaw<{ destination: string; count: bigint }[]>`
    SELECT unnest(destinations_mentioned) AS destination, COUNT(*)::bigint AS count
    FROM traveler_profiles
    WHERE array_length(destinations_mentioned, 1) > 0
    GROUP BY destination
    ORDER BY count DESC
    LIMIT 10
  `;

  const funnel = {
    sessions: sessionCount,
    consented,
    profiled: profileCount,
    itineraries: itineraryCount,
    consentRate: sessionCount ? consented / sessionCount : 0,
    proposalRate: profileCount ? itineraryCount / profileCount : 0,
  };

  res.json({
    funnel,
    archetypes: archetypes.map((a) => ({ key: a.travelArchetype, count: a._count._all })),
    budgetTiers: budgetTiers.map((b) => ({ key: b.budgetTier, count: b._count._all })),
    topDestinations: topDestinations.map((d) => ({ destination: d.destination, count: Number(d.count) })),
  });
});

const ExportSchema = z.object({
  sessionId: z.string().uuid(),
});

router.post('/segments/export', async (req: Request, res: Response) => {
  const parse = ExportSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'INVALID_INPUT', details: parse.error.flatten() });
    return;
  }

  const { sessionId } = parse.data;

  const profile = await prisma.travelerProfile.findUnique({ where: { sessionId } });
  if (!profile) {
    res.status(404).json({ error: 'PROFILE_NOT_FOUND' });
    return;
  }

  const segments = profile.adSegments.length > 0
    ? profile.adSegments
    : buildSegments(profile);

  const row = await prisma.adSegmentsExport.create({
    data: {
      sessionId,
      segments,
      budgetTier: profile.budgetTier,
      destinations: profile.destinationsMentioned,
    },
  });

  res.status(201).json({ id: row.id, segments, destinations: row.destinations });
});

const QuerySchema = z.object({
  budgetTier: z.string().optional(),
  destination: z.string().optional(),
  since: z.string().datetime().optional(),
  until: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
});

router.get('/segments', async (req: Request, res: Response) => {
  const parse = QuerySchema.safeParse(req.query);
  if (!parse.success) {
    res.status(400).json({ error: 'INVALID_INPUT', details: parse.error.flatten() });
    return;
  }

  const { budgetTier, destination, since, until, limit } = parse.data;

  const rows = await prisma.adSegmentsExport.findMany({
    where: {
      ...(budgetTier ? { budgetTier } : {}),
      ...(destination ? { destinations: { has: destination } } : {}),
      ...(since || until
        ? {
            createdAt: {
              ...(since ? { gte: new Date(since) } : {}),
              ...(until ? { lte: new Date(until) } : {}),
            },
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  res.json({ count: rows.length, rows });
});

function buildSegments(p: {
  travelArchetype: string | null;
  budgetTier: string | null;
  groupType: string | null;
  destinationsMentioned: string[];
  activitiesPreferred: string[];
}): string[] {
  const out: string[] = [];
  if (p.travelArchetype) out.push(`archetype:${p.travelArchetype}`);
  if (p.budgetTier) out.push(`budget:${p.budgetTier}`);
  if (p.groupType) out.push(`group:${p.groupType}`);
  for (const d of p.destinationsMentioned.slice(0, 5)) out.push(`dest:${d.toLowerCase().replace(/\s+/g, '_')}`);
  for (const a of p.activitiesPreferred.slice(0, 5)) out.push(`act:${a.toLowerCase().replace(/\s+/g, '_')}`);
  return out;
}

export default router;
