import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSession } from '../hooks/useSession';
import { ConsentBanner } from '../components/UI/ConsentBanner';
import { useState } from 'react';

const DESTINATIONS = ['Paris', 'Bali', 'Tokyo', 'Maldives', 'Santorini', 'Istanbul', 'Kyoto'];

export default function Landing() {
  const navigate = useNavigate();
  const { createSession } = useSession();
  const [loading, setLoading] = useState(false);
  const [showConsent, setShowConsent] = useState(true);
  const [consentDeclined, setConsentDeclined] = useState(false);

  const handleStart = async (consentGiven: boolean) => {
    setLoading(true);
    try {
      await createSession(consentGiven);
      navigate('/chat');
    } catch {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    setShowConsent(false);
    handleStart(true);
  };

  const handleDecline = () => {
    setShowConsent(false);
    setConsentDeclined(true);
  };

  return (
    <div className="min-h-dvh flex flex-col relative overflow-hidden bg-noise">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 50% -10%, rgba(212,168,83,0.12) 0%, transparent 70%),
            radial-gradient(ellipse 50% 40% at 80% 80%, rgba(226,185,126,0.06) 0%, transparent 60%)
          `,
        }}
      />

      <header className="relative z-10 flex items-center justify-between px-6 py-5">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2.5"
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #d4a853, #e2b97e)' }}
          >
            <span className="text-rihla-primary font-bold text-sm font-display">ر</span>
          </div>
          <span className="font-display font-semibold text-rihla-text tracking-wide">Rihla</span>
        </motion.div>

        <motion.nav
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="hidden md:flex items-center gap-6 text-sm text-rihla-muted"
        >
          <a href="/about" className="hover:text-rihla-text transition-colors">About</a>
          <a href="/privacy" className="hover:text-rihla-text transition-colors">Privacy</a>
        </motion.nav>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl mx-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs text-rihla-accent mb-8"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rihla-accent animate-pulse-soft" />
            AI-Powered Travel Planning
          </motion.div>

          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-rihla-text leading-tight mb-6">
            Your Journey,{' '}
            <span className="text-gradient">Perfectly</span>
            <br />
            Crafted
          </h1>

          <p className="text-rihla-muted text-lg md:text-xl leading-relaxed mb-10 max-w-lg mx-auto">
            Tell Rihla where you dream of going. She listens, understands, and builds the trip of your life.
          </p>

          {consentDeclined ? (
            <div className="glass rounded-2xl px-6 py-5 max-w-sm mx-auto text-center">
              <p className="text-rihla-muted text-sm mb-4">
                We respect your choice. Limited personalization will be available without data collection.
              </p>
              <button
                onClick={() => handleStart(false)}
                disabled={loading}
                className="btn-ghost w-full"
              >
                {loading ? 'Starting...' : 'Continue without tracking'}
              </button>
            </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowConsent(true)}
              disabled={loading}
              className="btn-primary text-base px-8 py-4 shadow-lg"
              style={{ boxShadow: '0 8px 32px rgba(212,168,83,0.25)' }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <motion.span
                    className="w-4 h-4 border-2 border-rihla-primary border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                  Starting your journey...
                </span>
              ) : (
                <>
                  Start Planning
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </>
              )}
            </motion.button>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="mt-20 flex flex-wrap justify-center gap-2 max-w-xl mx-auto"
        >
          {DESTINATIONS.map((dest, i) => (
            <motion.span
              key={dest}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 + i * 0.07 }}
              className="glass text-rihla-muted text-xs px-3 py-1.5 rounded-full"
            >
              {dest}
            </motion.span>
          ))}
        </motion.div>
      </main>

      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="relative z-10 text-center pb-6 text-rihla-muted text-xs"
      >
        © 2025 Rihla · <a href="/privacy" className="hover:text-rihla-text transition-colors">Privacy</a> · <a href="/terms" className="hover:text-rihla-text transition-colors">Terms</a>
      </motion.footer>

      {showConsent && !consentDeclined && !loading && (
        <ConsentBanner onAccept={handleAccept} onDecline={handleDecline} />
      )}
    </div>
  );
}
