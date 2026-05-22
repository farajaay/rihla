import { useRef, useCallback, KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import { useChatStore } from '../../stores/chatStore';
import { useT } from '../../lib/i18n';

interface InputBarProps {
  onSend: (message: string) => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export function InputBar({ onSend, isStreaming, disabled }: InputBarProps) {
  const t = useT();
  const { inputValue, setInputValue } = useChatStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const msg = inputValue.trim();
    if (!msg || isStreaming || disabled) return;
    onSend(msg);
    setInputValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [inputValue, isStreaming, disabled, onSend, setInputValue]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const canSend = inputValue.trim().length > 0 && !isStreaming && !disabled;

  return (
    <div className="glass rounded-2xl px-4 py-3 flex items-end gap-3">
      <textarea
        ref={textareaRef}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        placeholder={t('chat.placeholder')}
        rows={1}
        disabled={isStreaming || disabled}
        className="input-field min-h-[24px] max-h-[160px]"
        aria-label={t('chat.placeholder')}
      />

      <motion.button
        whileTap={{ scale: 0.92 }}
        whileHover={canSend ? { scale: 1.06 } : {}}
        onClick={handleSend}
        disabled={!canSend}
        aria-label={t('chat.send')}
        className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${
          canSend
            ? 'bg-rihla-accent text-rihla-primary hover:bg-rihla-gold'
            : 'bg-white/5 text-rihla-muted cursor-not-allowed'
        }`}
      >
        {isStreaming ? (
          <motion.div
            className="w-3.5 h-3.5 border-2 border-rihla-muted border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          />
        ) : (
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        )}
      </motion.button>
    </div>
  );
}
