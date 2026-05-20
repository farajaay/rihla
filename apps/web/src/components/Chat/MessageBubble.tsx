import { motion } from 'framer-motion';
import type { ChatMessage } from '../../stores/chatStore';
import { RihlaAvatar } from '../UI/RihlaAvatar';

interface MessageBubbleProps {
  message: ChatMessage;
  index: number;
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-rihla-accent"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </span>
  );
}

export function MessageBubble({ message, index }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isEmpty = !message.content && message.isStreaming;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.02, ease: 'easeOut' }}
      className={`flex items-end gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {!isUser && <RihlaAvatar isTyping={!!message.isStreaming} size="sm" />}

      <div className={isUser ? 'message-user' : 'message-assistant'}>
        {isEmpty ? (
          <TypingDots />
        ) : (
          <span className="whitespace-pre-wrap">{message.content}</span>
        )}
        {message.isStreaming && message.content && (
          <motion.span
            className="inline-block w-0.5 h-3.5 ml-0.5 bg-rihla-accent align-middle"
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.6, repeat: Infinity }}
          />
        )}
      </div>
    </motion.div>
  );
}
