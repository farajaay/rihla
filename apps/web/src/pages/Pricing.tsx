import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useT } from '../lib/i18n';

const FEATURES = [
  'Unlimited AI travel conversations',
  'Personalized multi-day itineraries',
  'Day-by-day activity planning',
  'Budget-aware recommendations',
  'Halal & family-friendly options',
  'Itinerary refinement — refine with chat',
  'PDF export & print-ready layout',
  'No account required',
];

const COMING_SOON = [
  'One-click hotel & flight booking',
  'Real-time pricing from partners',
  'Saved trips & favourites',
  'Group collaboration',
  'Mobile app (iOS & Android)',
];

export default function Pricing() {
  const t = useT();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-dvh"
    >
      {/* Header */}
      <div className="relative px-6 pt-16 pb-20 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none hero-glow" />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative z-10 max-w-2xl mx-auto"
        >
          <Link to="/" className="inline-flex items-center gap-2 mb-10 text-rihla-muted text-sm hover:text-rihla-text transition-colors">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Rihla
          </Link>

          <h1 className="font-display text-4xl md:text-5xl font-bold text-rihla-text mb-4">
            {t('pricing.title')}
          </h1>
          <p className="text-rihla-muted text-lg md:text-xl">
            {t('pricing.tagline')}
          </p>
        </motion.div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Free plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-rihla-gold/30 p-8 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(212,168,83,0.08), rgba(226,185,126,0.03))' }}
          >
            <div className="absolute top-4 right-4">
              <span className="text-[10px] uppercase tracking-widest text-rihla-accent bg-rihla-gold/15 border border-rihla-gold/25 rounded-full px-3 py-1">
                Current
              </span>
            </div>

            <div className="mb-6">
              <p className="text-rihla-muted text-xs uppercase tracking-widest mb-2">Planning</p>
              <div className="flex items-end gap-2">
                <span className="font-display text-5xl font-bold text-rihla-text">Free</span>
              </div>
              <p className="text-rihla-muted text-sm mt-2">Forever, no card required</p>
            </div>

            <Link
              to="/chat"
              className="block w-full text-center text-rihla-primary font-medium px-6 py-3 rounded-xl text-sm mb-8 transition-opacity hover:opacity-90"
              style={{ background: 'var(--rihla-brand-gradient)', color: 'var(--rihla-on-gold)' }}
            >
              Start Planning
            </Link>

            <ul className="space-y-3">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-rihla-text/80">
                  <span className="text-rihla-gold mt-0.5 flex-shrink-0">✦</span>
                  {f}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Booking plan (coming soon) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl border border-white/10 p-8 bg-rihla-secondary/30"
          >
            <div className="mb-6">
              <p className="text-rihla-muted text-xs uppercase tracking-widest mb-2">Booking</p>
              <div className="flex items-end gap-2">
                <span className="font-display text-5xl font-bold text-rihla-text">TBD</span>
              </div>
              <p className="text-rihla-muted text-sm mt-2">Commission-based · no upfront cost</p>
            </div>

            <button
              disabled
              className="block w-full text-center text-rihla-muted font-medium px-6 py-3 rounded-xl text-sm mb-8 bg-white/5 border border-white/10 cursor-not-allowed"
            >
              Coming Soon
            </button>

            <p className="text-rihla-muted text-xs uppercase tracking-widest mb-3 font-medium">Everything in Free, plus:</p>
            <ul className="space-y-3">
              {COMING_SOON.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-rihla-text/50">
                  <span className="text-white/20 mt-0.5 flex-shrink-0">◎</span>
                  {f}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* FAQ strip */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-16 grid sm:grid-cols-3 gap-6"
        >
          {[
            {
              q: 'Do I need to sign up?',
              a: 'No. Rihla works entirely anonymously. Just open the app and start chatting.',
            },
            {
              q: 'Is my data sold?',
              a: 'Never. Your chat data is used only to generate your itinerary and is never sold to advertisers.',
            },
            {
              q: 'How does the AI work?',
              a: 'Rihla uses Claude by Anthropic. It reads your messages, builds a traveler profile, and crafts a fully personalized itinerary.',
            },
          ].map(({ q, a }) => (
            <div key={q} className="space-y-2">
              <p className="text-rihla-text text-sm font-medium">{q}</p>
              <p className="text-rihla-muted text-sm leading-relaxed">{a}</p>
            </div>
          ))}
        </motion.div>
      </div>

      <div className="border-t border-white/5 py-8 text-center text-rihla-muted text-xs space-x-6">
        <Link to="/" className="hover:text-rihla-text transition-colors">Home</Link>
        <Link to="/privacy" className="hover:text-rihla-text transition-colors">{t('nav.privacy')}</Link>
        <Link to="/terms" className="hover:text-rihla-text transition-colors">{t('nav.terms')}</Link>
      </div>
    </motion.div>
  );
}
