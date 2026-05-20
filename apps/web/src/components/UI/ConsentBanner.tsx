import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

interface ConsentBannerProps {
  onAccept: () => void;
  onDecline: () => void;
}

export function ConsentBanner({ onAccept, onDecline }: ConsentBannerProps) {
  const [visible, setVisible] = useState(true);

  const handleAccept = () => {
    setVisible(false);
    setTimeout(onAccept, 300);
  };

  const handleDecline = () => {
    setVisible(false);
    setTimeout(onDecline, 300);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 24, stiffness: 280 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-md z-50"
        >
          <div className="glass rounded-2xl p-5 shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <span className="text-2xl" role="img" aria-label="cookie">🍪</span>
              <div>
                <p className="font-semibold text-rihla-text text-sm mb-1">
                  We personalize your experience
                </p>
                <p className="text-rihla-muted text-xs leading-relaxed">
                  Rihla uses session data to tailor travel recommendations for you.
                  No personal data is sold. You can delete your data anytime.{' '}
                  <a href="/privacy" className="text-rihla-accent underline underline-offset-2">
                    Privacy Policy
                  </a>
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleAccept}
                className="btn-primary flex-1 text-sm py-2.5"
              >
                Accept & Continue
              </button>
              <button
                onClick={handleDecline}
                className="btn-ghost flex-1 text-sm py-2.5"
              >
                Decline
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
