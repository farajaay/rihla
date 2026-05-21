import { useCallback, useRef } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useSessionStore, type ConversationStage } from '../stores/sessionStore';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

type SSEEvent = 'stage' | 'chunk' | 'done' | 'error';

function parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onEvent: (event: SSEEvent, data: Record<string, unknown>) => void
): Promise<void> {
  const decoder = new TextDecoder();
  let buffer = '';
  let currentEvent: SSEEvent = 'chunk';

  async function pump(): Promise<void> {
    const { done, value } = await reader.read();
    if (done) return;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        currentEvent = line.slice(7).trim() as SSEEvent;
      } else if (line.startsWith('data: ')) {
        try {
          const parsed = JSON.parse(line.slice(6)) as Record<string, unknown>;
          onEvent(currentEvent, parsed);
        } catch {
          // malformed JSON — skip
        }
      }
    }

    return pump();
  }

  return pump();
}

export function useChat() {
  const { messages, isStreaming, addMessage, updateStreamingMessage, finalizeMessage, setIsStreaming } =
    useChatStore();
  const { sessionId, setProfileCompleteness, setStage, setAdSegments } = useSessionStore();
  const abortRef = useRef<AbortController | null>(null);

  const handleDoneEvent = useCallback(
    (data: Record<string, unknown>) => {
      if (typeof data.profile_completeness === 'number') {
        setProfileCompleteness(data.profile_completeness);
      }
      if (typeof data.stage === 'string') setStage(data.stage as ConversationStage);
      if (Array.isArray(data.ad_segments)) setAdSegments(data.ad_segments as string[]);
    },
    [setProfileCompleteness, setStage, setAdSegments]
  );

  // Triggers the AI greeting with no user message stored or shown
  const initConversation = useCallback(async (): Promise<void> => {
    if (!sessionId || isStreaming) return;

    const assistantId = addMessage({ role: 'assistant', content: '', isStreaming: true });
    setIsStreaming(true);
    abortRef.current = new AbortController();

    try {
      const res = await fetch(`${API_BASE}/chat/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Session-Id': sessionId },
        body: JSON.stringify({ sessionId }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error('Init stream failed');

      let accumulated = '';
      await parseSSEStream(res.body.getReader(), (event, data) => {
        if (event === 'chunk' && typeof data.text === 'string') {
          accumulated += data.text;
          updateStreamingMessage(assistantId, accumulated);
        } else if (event === 'done') {
          handleDoneEvent(data);
        }
      });

      finalizeMessage(assistantId, accumulated);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        finalizeMessage(assistantId, 'Hello! I\'m Rihla, your AI travel consultant. Where would you like to go?');
        console.error('[useChat/init] error:', err);
      }
    } finally {
      setIsStreaming(false);
    }
  }, [sessionId, isStreaming, addMessage, updateStreamingMessage, finalizeMessage, setIsStreaming, handleDoneEvent]);

  const sendMessage = useCallback(
    async (content: string): Promise<void> => {
      if (!sessionId || isStreaming || !content.trim()) return;

      addMessage({ role: 'user', content: content.trim() });
      const assistantId = addMessage({ role: 'assistant', content: '', isStreaming: true });
      setIsStreaming(true);
      abortRef.current = new AbortController();

      try {
        const res = await fetch(`${API_BASE}/chat/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Session-Id': sessionId },
          body: JSON.stringify({ sessionId, message: content.trim() }),
          signal: abortRef.current.signal,
        });

        if (!res.ok || !res.body) throw new Error('Stream request failed');

        let accumulated = '';
        await parseSSEStream(res.body.getReader(), (event, data) => {
          if (event === 'chunk' && typeof data.text === 'string') {
            accumulated += data.text;
            updateStreamingMessage(assistantId, accumulated);
          } else if (event === 'done') {
            handleDoneEvent(data);
          }
        });

        finalizeMessage(assistantId, accumulated);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          finalizeMessage(assistantId, 'Sorry, something went wrong. Please try again.');
          console.error('[useChat] error:', err);
        }
      } finally {
        setIsStreaming(false);
      }
    },
    [sessionId, isStreaming, addMessage, updateStreamingMessage, finalizeMessage, setIsStreaming, handleDoneEvent]
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, [setIsStreaming]);

  return { messages, isStreaming, sendMessage, initConversation, stopStreaming };
}
