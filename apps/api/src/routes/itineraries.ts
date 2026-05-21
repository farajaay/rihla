import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import prisma from '../services/db';
import { generateItinerary } from '../services/claude';
import { mapPrismaProfile } from '../services/profiler';
import { track } from '../services/analytics';

const router = Router();

const GenerateSchema = z.object({
  sessionId: z.string().uuid(),
});

router.post('/generate', async (req: Request, res: Response) => {
  const parse = GenerateSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'INVALID_INPUT', details: parse.error.flatten() });
    return;
  }

  const { sessionId } = parse.data;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { profile: true },
  });

  if (!session) {
    res.status(404).json({ error: 'SESSION_NOT_FOUND' });
    return;
  }

  // Return existing itinerary if already generated for this session
  const existing = await prisma.itinerary.findFirst({
    where: { sessionId },
    orderBy: { createdAt: 'desc' },
  });

  if (existing) {
    res.json({ id: existing.id, itinerary: existing.itineraryJson });
    return;
  }

  const profile = mapPrismaProfile(session.profile as Record<string, unknown> | null);

  try {
    const itineraryData = await generateItinerary(profile);

    const saved = await prisma.itinerary.create({
      data: {
        sessionId,
        profileId: session.profile?.id ?? null,
        title: itineraryData.title,
        destination: itineraryData.destination,
        durationDays: itineraryData.duration_days,
        budgetTier: itineraryData.budget_tier,
        totalSarEstimate: Math.round(itineraryData.total_estimated_cost_sar),
        itineraryJson: itineraryData as unknown as import('@prisma/client').Prisma.JsonObject,
      },
    });

    void track(sessionId, 'itinerary_generated', {
      destination: itineraryData.destination,
      durationDays: itineraryData.duration_days,
      budgetTier: itineraryData.budget_tier,
      totalSar: Math.round(itineraryData.total_estimated_cost_sar),
    });

    res.json({ id: saved.id, itinerary: itineraryData });
  } catch (err) {
    console.error('[Itinerary/generate] error:', err);
    void track(sessionId, 'itinerary_generation_failed', { error: (err as Error).message });
    res.status(500).json({ error: 'GENERATION_FAILED', message: 'Could not generate itinerary.' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const itinerary = await prisma.itinerary.findUnique({
    where: { id },
    include: { profile: true },
  });

  if (!itinerary) {
    res.status(404).json({ error: 'ITINERARY_NOT_FOUND' });
    return;
  }

  res.json(itinerary);
});

router.get('/session/:sessionId', async (req: Request, res: Response) => {
  const { sessionId } = req.params;

  const itineraries = await prisma.itinerary.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ itineraries });
});

export default router;
