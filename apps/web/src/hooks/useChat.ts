import { useCallback, useRef } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useSessionStore } from '../stores/sessionStore';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

export function useChat() {
  const { messages, isStreaming, addMessage, updateStreamingMessage, finalizeMessage, setIsStreaming } = useChatStore();
  const { sessionId, setProfileCompleteness, setStage, setAdSegments } = useSessionStore();
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string): Promise<void> => {
    if (!sessionId || isStreaming || !content.trim()) return;

    addMessage({ role: 'user', content: content.trim() });

    const assistantId = addMessage({ role: 'assistant', content: '', isStreaming: true });
    setIsStreaming(true);

    abortRef.current = new AbortController();

    try {
      const res = await fetch(`${API_BASE}/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': sessionId,
        },
        body: JSON.stringify({ sessionId, message: content.trim() }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error('Stream request failed');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            continue;
          }
          if (line.startsWith('data: ')) {
            const raw = line.slice(6);
            try {
              const parsed = JSON.parse(raw) as Record<string, unknown>;
              if ('text' in parsed && typeof parsed.text === 'string') {
                accumulated += parsed.text;
                updateStreamingMessage(assistantId, accumulated);
              } else if ('profile_completeness' in parsed) {
                setProfileCompleteness(parsed.profile_completeness as number);
                if ('stage' in parsed) setStage(parsed.stage as any);
                if ('ad_segments' in parsed) setAdSegments(parsed.ad_segments as string[]);
              }
            } catch {
              // partial JSON — skip
            }
          }
        }
      }

      finalizeMessage(assistantId, accumulated);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        finalizeMessage(assistantId, 'Sorry, something went wrong. Please try again.');
        console.error('[useChat] error:', err);
      }
    } finally {
      setIsStreaming(false);
    }
  }, [sessionId, isStreaming, addMessage, updateStreamingMessage, finalizeMessage, setIsStreaming, setProfileCompleteness, setStage, setAdSegments]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, [setIsStreaming]);

  return { messages, isStreaming, sendMessage, stopStreaming };
}
