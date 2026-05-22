import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageBubble } from './MessageBubble';
import { InputBar } from './InputBar';
import { RihlaAvatar } from '../UI/RihlaAvatar';
import { useChat } from '../../hooks/useChat';
import { useSessionStore } from '../../stores/sessionStore';
import { useT } from '../../lib/i18n';

interface ChatWindowProps {
  disabled?: boolean;
}

export function ChatWindow({ disabled }: ChatWindowProps) {
  const t = useT();
  const { messages, isStreaming, sendMessage } = useChat();
  const { stage, profileCompleteness } = useSessionStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <RihlaAvatar isTyping={isStreaming} size="md" />
          <div>
            <p className="font-semibold text-rihla-text text-sm">Rihla</p>
            <p className="text-rihla-muted text-xs">
              {isStreaming ? t('chat.thinking') : t('chat.consultant')}
            </p>
          </div>
        </div>

        {profileCompleteness > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-rihla-muted text-xs hidden sm:block">
              {stage === 'proposal' ? t('chat.readyToPropose') : t('chat.buildingProfile')}
            </span>
            <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'var(--rihla-brand-gradient)' }}
                initial={{ width: 0 }}
                animate={{ width: `${profileCompleteness * 100}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        <AnimatePresence>
          {isEmpty && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center h-full text-center py-16 px-4"
            >
              <RihlaAvatar size="lg" />
              <h2 className="font-display text-xl text-rihla-text mt-4 mb-2">
                {t('chat.emptyHeading')}
              </h2>
              <p className="text-rihla-muted text-sm max-w-xs leading-relaxed">
                {t('chat.emptyBody')}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {messages.map((msg, i) => (
          <MessageBubble key={msg.id} message={msg} index={i} />
        ))}

        <div ref={bottomRef} />
      </div>

      <div className="px-4 pb-4 pt-2">
        <InputBar onSend={sendMessage} isStreaming={isStreaming} disabled={disabled} />
        <p className="text-center text-rihla-muted text-xs mt-2 opacity-60">
          {t('chat.enterHint')}
        </p>
      </div>
    </div>
  );
}
