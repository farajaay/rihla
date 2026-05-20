import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatWindow } from '../components/Chat/ChatWindow';
import { useSessionStore } from '../stores/sessionStore';
import { useChatStore } from '../stores/chatStore';
import { useChat } from '../hooks/useChat';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

export default function Chat() {
  const navigate = useNavigate();
  const { sessionId, consentGiven, stage } = useSessionStore();
  const { messages } = useChatStore();
  const { initConversation, isStreaming } = useChat();
  const initFired = useRef(false);
  const proposalFired = useRef(false);
  const [generatingItinerary, setGeneratingItinerary] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      navigate('/', { replace: true });
    }
  }, [sessionId, navigate]);

  useEffect(() => {
    if (sessionId && consentGiven && messages.length === 0 && !initFired.current) {
      initFired.current = true;
      initConversation();
    }
  // initConversation is stable (useCallback with no changing deps at call-time)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, consentGiven]);

  // Generate itinerary the first time stage reaches 'proposal' and streaming is done
  useEffect(() => {
    if (stage !== 'proposal' || isStreaming || proposalFired.current || !sessionId) return;
    proposalFired.current = true;
    setGeneratingItinerary(true);

    fetch(`${API_BASE}/itineraries/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })
      .then((r) => r.json())
      .then(({ id }: { id: string }) => navigate(`/itinerary/${id}`))
      .catch(() => setGeneratingItinerary(false));
  }, [stage, isStreaming, sessionId, navigate]);

  if (!sessionId) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="h-dvh flex flex-col md:flex-row"
    >
      <div className="hidden md:flex flex-col justify-between w-64 lg:w-72 border-r border-white/5 p-6 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2.5 mb-8">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #d4a853, #e2b97e)' }}
            >
              <span className="text-rihla-primary font-bold text-sm font-display">ر</span>
            </div>
            <span className="font-display font-semibold text-rihla-text">Rihla</span>
          </div>

          <div className="space-y-1">
            <p className="text-rihla-muted text-xs uppercase tracking-widest mb-3 font-medium">Session</p>
            <div className="glass rounded-xl p-3">
              <p className="text-rihla-muted text-xs">
                Stage: <span className="text-rihla-accent capitalize">{stage}</span>
              </p>
              <p className="text-rihla-muted text-xs mt-1">
                Messages: <span className="text-rihla-text">{messages.filter((m) => m.role === 'user').length}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={() => navigate('/')}
            className="w-full text-left text-rihla-muted text-xs hover:text-rihla-text transition-colors py-2 flex items-center gap-2"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            New Journey
          </button>
          <a href="/privacy" className="block text-rihla-muted text-xs hover:text-rihla-text transition-colors py-1">
            Privacy Policy
          </a>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 relative">
        <ChatWindow disabled={!consentGiven} />

        {/* Itinerary generation overlay */}
        <AnimatePresence>
          {generatingItinerary && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex items-center justify-center z-50"
              style={{ background: 'rgba(26,26,46,0.92)', backdropFilter: 'blur(12px)' }}
            >
              <div className="text-center space-y-5 px-6">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  className="w-12 h-12 mx-auto rounded-full border-2 border-rihla-gold/30 border-t-rihla-gold"
                />
                <div>
                  <p className="font-display text-xl text-rihla-text mb-1">Building your itinerary</p>
                  <p className="text-rihla-muted text-sm">Crafting every detail just for you…</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
