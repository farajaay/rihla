import { motion } from 'framer-motion';

interface RihlaAvatarProps {
  isTyping?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = { sm: 'w-7 h-7', md: 'w-9 h-9', lg: 'w-12 h-12' };

export function RihlaAvatar({ isTyping = false, size = 'md' }: RihlaAvatarProps) {
  return (
    <motion.div
      animate={isTyping ? { scale: [1, 1.08, 1] } : {}}
      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      className={`${sizes[size]} rounded-full flex items-center justify-center flex-shrink-0`}
      style={{
        background: 'linear-gradient(135deg, #d4a853 0%, #e2b97e 50%, #c8943e 100%)',
        boxShadow: isTyping ? '0 0 16px rgba(212,168,83,0.4)' : '0 0 8px rgba(212,168,83,0.2)',
      }}
    >
      <span className="text-rihla-primary font-display font-bold" style={{ fontSize: size === 'sm' ? '12px' : size === 'md' ? '15px' : '20px' }}>
        ر
      </span>
    </motion.div>
  );
}
