import { AnimatePresence, motion } from 'framer-motion';

export function ComboBadge({ combo }: { combo: number }) {
  return (
    <AnimatePresence>
      {combo >= 2 && (
        <motion.span
          key={combo}
          initial={{ scale: 1.6, rotate: -8 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, opacity: 0 }}
          className="rounded-full bg-gradient-to-l from-orange-400 to-pink-500 px-3 py-1 text-sm font-extrabold text-white shadow"
        >
          קומבו ×{combo} 🔥
        </motion.span>
      )}
    </AnimatePresence>
  );
}
