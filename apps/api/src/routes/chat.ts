import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import prisma from '../services/db';
import { streamChat, extractProfileSignals } from '../services/claude';
import { updateProfile, determineStage } from '../services/profiler';
import { chatRateLimit } from '../middleware/rateLimit';

const router = Router();

const SendMessageSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1).max(4000),
});

router.post('/message', chatRateLimit, async (req: Request, res: Response) => {
  const parse = SendMessageSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'INVALID_INPUT', details: parse.error.flatten() });
    return;
  }

  const { sessionId, message } = parse.data;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { profile: true },
  });

  if (!session) {
    res.status(404).json({ error: 'SESSION_NOT_FOUND' });
    return;
  }

  if (!session.consentGiven) {
    res.status(403).json({ error: 'CONSENT_REQUIRED' });
    return;
  }

  const conversationHistory = await prisma.conversation.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
    select: { role: true, content: true },
  });

  await prisma.conversation.create({
    data: { sessionId, role: 'user', content: message },
  });

  const currentProfile = session.profile ?? {};
  const stage = determineStage(currentProfile as any, conversationHistory.length);

  const extractionPromise = extractProfileSignals(message, currentProfile as any);

  const messages = [
    ...conversationHistory.map((c) => ({ role: c.role as 'user' | 'assistant', content: c.content })),
    { role: 'user' as const, content: message },
  ];

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  let fullResponse = '';

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  sendEvent('stage', { stage });

  try {
    await streamChat({
      messages,
      profile: currentProfile as any,
      stage,
      messageCount: conversationHistory.length,
      onChunk: (chunk) => {
        fullResponse += chunk;
        sendEvent('chunk', { text: chunk });
      },
      onComplete: async (text) => {
        await prisma.conversation.create({
          data: { sessionId, role: 'assistant', content: text },
        });

        const extraction = await extractionPromise;
        const updatedProfile = await updateProfile(sessionId, extraction, message);

        sendEvent('done', {
          profile_completeness: updatedProfile.profileCompleteness,
          stage: determineStage(updatedProfile, conversationHistory.length + 2),
          ad_segments: updatedProfile.ad_segments,
        });

        res.end();
      },
    });
  } catch (err) {
    console.error('[Chat] stream error:', err);
    sendEvent('error', { message: 'An error occurred. Please try again.' });
    res.end();
  }
});

router.get('/history/:sessionId', async (req: Request, res: Response) => {
  const { sessionId } = req.params;

  const messages = await prisma.conversation.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, role: true, content: true, createdAt: true },
  });

  res.json({ messages });
});

export default router;
