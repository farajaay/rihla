import { motion } from 'framer-motion';

export default function RouteFallback() {
  return (
    <div className="min-h-dvh flex items-center justify-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        className="w-8 h-8 rounded-full border-2 border-rihla-gold/30 border-t-rihla-gold"
      />
    </div>
  );
}
