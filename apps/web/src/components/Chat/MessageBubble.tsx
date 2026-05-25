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

function renderInline(text: string): React.ReactNode {
  const regex = /(\*\*[^*\n]+?\*\*|\*[^*\n]+?\*)/g;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith('**')) {
      parts.push(<strong key={key++} className="font-semibold text-rihla-text">{token.slice(2, -2)}</strong>);
    } else {
      parts.push(<em key={key++}>{token.slice(1, -1)}</em>);
    }
    last = match.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));

  return parts.length === 0 ? '' : parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : <>{parts}</>;
}

function MarkdownContent({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);

  return (
    <div className="space-y-2">
      {blocks.map((block, bi) => {
        const lines = block.split('\n');
        const listLines = lines.filter((l) => /^[-•*] /.test(l.trimStart()));
        const nonListLines = lines.filter((l) => !/^[-•*] /.test(l.trimStart()) && l.trim() !== '');

        if (listLines.length > 0 && nonListLines.length === 0) {
          return (
            <ul key={bi} className="space-y-1 ml-1">
              {listLines.map((item, ii) => (
                <li key={ii} className="flex items-start gap-2">
                  <span className="text-rihla-accent mt-0.5 text-xs flex-shrink-0">•</span>
                  <span className="leading-relaxed">{renderInline(item.replace(/^[-•*] /, '').trim())}</span>
                </li>
              ))}
            </ul>
          );
        }

        if (listLines.length > 0) {
          return (
            <div key={bi} className="space-y-1">
              {lines.map((line, li) => {
                const trimmed = line.trimStart();
                if (/^[-•*] /.test(trimmed)) {
                  return (
                    <div key={li} className="flex items-start gap-2">
                      <span className="text-rihla-accent mt-0.5 text-xs flex-shrink-0">•</span>
                      <span className="leading-relaxed">{renderInline(trimmed.replace(/^[-•*] /, ''))}</span>
                    </div>
                  );
                }
                return line.trim() ? (
                  <p key={li} className="leading-relaxed">{renderInline(line)}</p>
                ) : null;
              })}
            </div>
          );
        }

        return (
          <p key={bi} className="leading-relaxed">
            {lines.map((line, li) => (
              <span key={li}>
                {renderInline(line)}
                {li < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        );
      })}
    </div>
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
        ) : isUser ? (
          <span className="whitespace-pre-wrap">{message.content}</span>
        ) : (
          <MarkdownContent text={message.content} />
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
