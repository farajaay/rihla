import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import prisma from '../services/db';
import { streamChat, extractProfileSignals } from '../services/claude';
import { updateProfile, determineStage } from '../services/profiler';
import { chatRateLimit } from '../middleware/rateLimit';
import {
  getCachedProfile,
  setCachedProfile,
  getCachedConversation,
  setCachedConversation,
  appendToConversationCache,
} from '../services/redis';

const router = Router();

const SendMessageSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1).max(4000),
});

function openSSE(res: Response): (event: string, data: unknown) => void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  return (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

async function getSession(sessionId: string) {
  return prisma.session.findUnique({
    where: { id: sessionId },
    include: { profile: true },
  });
}

async function getConversationHistory(sessionId: string) {
  const cached = await getCachedConversation(sessionId);
  if (cached) return cached;

  const rows = await prisma.conversation.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
    select: { role: true, content: true },
  });

  const messages = rows.map((r) => ({ role: r.role as 'user' | 'assistant', content: r.content }));
  await setCachedConversation(sessionId, messages);
  return messages;
}

async function getProfile(sessionId: string, dbProfile: Record<string, unknown> | null) {
  const cached = await getCachedProfile(sessionId);
  if (cached) return cached;
  return dbProfile ?? {};
}

// Greeting endpoint — AI speaks first, no user message stored
router.post('/init', chatRateLimit, async (req: Request, res: Response) => {
  const { sessionId } = req.body as { sessionId?: string };

  if (!sessionId || typeof sessionId !== 'string') {
    res.status(400).json({ error: 'INVALID_INPUT', message: 'sessionId required' });
    return;
  }

  const session = await getSession(sessionId);
  if (!session) { res.status(404).json({ error: 'SESSION_NOT_FOUND' }); return; }
  if (!session.consentGiven) { res.status(403).json({ error: 'CONSENT_REQUIRED' }); return; }

  const existingHistory = await getConversationHistory(sessionId);
  if (existingHistory.length > 0) {
    res.status(409).json({ error: 'ALREADY_INITIALIZED', message: 'Conversation already started.' });
    return;
  }

  const sendEvent = openSSE(res);
  sendEvent('stage', { stage: 'intake' });

  try {
    await streamChat({
      messages: [{ role: 'user', content: 'Hello' }],
      profile: session.profile ?? ({} as any),
      stage: 'intake',
      messageCount: 0,
      onChunk: (chunk) => sendEvent('chunk', { text: chunk }),
      onComplete: async (text) => {
        await Promise.all([
          prisma.conversation.create({ data: { sessionId, role: 'assistant', content: text } }),
          appendToConversationCache(sessionId, 'assistant', text),
        ]);
        sendEvent('done', { profile_completeness: 0, stage: 'intake', ad_segments: [] });
        res.end();
      },
    });
  } catch (err) {
    console.error('[Chat/init] error:', err);
    sendEvent('error', { message: 'Failed to start conversation.' });
    res.end();
  }
});

router.post('/message', chatRateLimit, async (req: Request, res: Response) => {
  const parse = SendMessageSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'INVALID_INPUT', details: parse.error.flatten() });
    return;
  }

  const { sessionId, message } = parse.data;

  const [session, conversationHistory] = await Promise.all([
    getSession(sessionId),
    getConversationHistory(sessionId),
  ]);

  if (!session) { res.status(404).json({ error: 'SESSION_NOT_FOUND' }); return; }
  if (!session.consentGiven) { res.status(403).json({ error: 'CONSENT_REQUIRED' }); return; }

  const currentProfile = await getProfile(sessionId, session.profile as any);
  const stage = determineStage(currentProfile as any, conversationHistory.length);

  // Start extraction in parallel with streaming — both fire immediately
  const extractionPromise = extractProfileSignals(message, currentProfile as any);

  // Persist user message to DB and cache simultaneously
  const userPersistPromise = Promise.all([
    prisma.conversation.create({ data: { sessionId, role: 'user', content: message } }),
    appendToConversationCache(sessionId, 'user', message),
  ]);

  const messages = [
    ...conversationHistory,
    { role: 'user' as const, content: message },
  ];

  const sendEvent = openSSE(res);
  sendEvent('stage', { stage });

  try {
    await streamChat({
      messages,
      profile: currentProfile as any,
      stage,
      messageCount: conversationHistory.length,
      onChunk: (chunk) => sendEvent('chunk', { text: chunk }),
      onComplete: async (text) => {
        // Persist assistant reply
        const [extraction] = await Promise.all([
          extractionPromise,
          userPersistPromise,
          prisma.conversation.create({ data: { sessionId, role: 'assistant', content: text } }),
          appendToConversationCache(sessionId, 'assistant', text),
        ]);

        // Update profile, then cache the result
        const updatedProfile = await updateProfile(sessionId, extraction, message);
        await setCachedProfile(sessionId, updatedProfile);

        const nextStage = determineStage(updatedProfile, conversationHistory.length + 2);

        sendEvent('done', {
          profile_completeness: updatedProfile.profileCompleteness,
          stage: nextStage,
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
