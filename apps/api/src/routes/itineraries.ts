import { Router, type Request, type Response } from 'express';
import prisma from '../services/db';

const router = Router();

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
