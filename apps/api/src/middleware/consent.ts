import type { Request, Response, NextFunction } from 'express';
import prisma from '../services/db';

export async function requireConsent(req: Request, res: Response, next: NextFunction): Promise<void> {
  const sessionId = req.headers['x-session-id'] as string | undefined;

  if (!sessionId) {
    next();
    return;
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { consentGiven: true },
  });

  if (!session?.consentGiven) {
    res.status(403).json({
      error: 'CONSENT_REQUIRED',
      message: 'User consent is required before processing data.',
    });
    return;
  }

  next();
}
