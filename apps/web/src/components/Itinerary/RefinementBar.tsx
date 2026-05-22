import { useState, useRef, type FormEvent, type KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useT, type StringKey } from '../../lib/i18n';

interface Props {
  onSubmit: (request: string) => void;
  disabled?: boolean;
}

const SUGGESTION_KEYS: StringKey[] = [
  'refine.chip.budget',
  'refine.chip.beach',
  'refine.chip.luxury',
  'refine.chip.extend',
  'refine.chip.halal',
];

export default function RefinementBar({ onSubmit, disabled }: Props) {
  const t = useT();
  const [value, setValue] = useState('');
  const [expanded, setExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function submit(text: string) {
    const trimmed = text.trim();
    if (trimmed.length < 3 || disabled) return;
    onSubmit(trimmed);
    setValue('');
    setExpanded(false);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    submit(value);
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit(value);
    }
  }

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.6, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="fixed bottom-0 left-0 right-0 z-40 print:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="max-w-3xl mx-auto px-4 pb-4">
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-wrap gap-2 mb-3"
            >
              {SUGGESTION_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => submit(t(key))}
                  disabled={disabled}
                  className="glass px-3 py-1.5 text-xs text-rihla-muted hover:text-rihla-text transition-colors disabled:opacity-50"
                  style={{ borderRadius: 'var(--rihla-r-md)' }}
                >
                  {t(key)}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <form
          onSubmit={handleSubmit}
          className="glass flex items-end gap-2 p-3 shadow-2xl"
          style={{
            borderRadius: 'var(--rihla-r-lg)',
            background: 'var(--rihla-overlay-frosted)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setExpanded((v) => !v);
              textareaRef.current?.focus();
            }}
            className="w-8 h-8 flex-shrink-0 flex items-center justify-center text-rihla-muted hover:text-rihla-accent transition-colors"
            style={{ borderRadius: 'var(--rihla-r-sm)' }}
            aria-label="Show suggestions"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path
                d={
                  expanded
                    ? 'M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z'
                    : 'M10 18a8 8 0 100-16 8 8 0 000 16zM9 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm1-4a1 1 0 100 2 1 1 0 000-2z'
                }
                clipRule="evenodd"
                fillRule="evenodd"
              />
            </svg>
          </button>

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKey}
            disabled={disabled}
            rows={1}
            placeholder={t('refine.placeholder')}
            className="flex-1 bg-transparent text-rihla-text placeholder-rihla-muted text-sm resize-none outline-none leading-relaxed max-h-32 overflow-y-auto"
            style={{ minHeight: '24px' }}
          />

          <button
            type="submit"
            disabled={disabled || value.trim().length < 3}
            className="w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center disabled:opacity-40 transition-all active:scale-95"
            style={{ background: 'var(--rihla-brand-gradient)' }}
            aria-label="Refine itinerary"
          >
            <svg viewBox="0 0 20 20" style={{ fill: 'var(--rihla-on-gold)' }} className="w-4 h-4">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </form>
      </div>
    </motion.div>
  );
}
