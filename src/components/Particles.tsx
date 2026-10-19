import { motion } from 'framer-motion';
import { useMemo } from 'react';

const COLORS = ['#a78bfa', '#f472b6', '#facc15', '#34d399', '#60a5fa', '#fb923c'];

/** One-shot confetti burst from the center of its parent. Re-mount (change `key`) to replay. */
export function Burst({ count = 18, spread = 140 }: { count?: number; spread?: number }) {
  const parts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
        const dist = spread * (0.5 + Math.random() * 0.6);
        return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, color: COLORS[i % COLORS.length], size: 6 + Math.random() * 8, rot: Math.random() * 360 };
      }),
    [count, spread],
  );
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible" aria-hidden>
      {parts.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-sm"
          style={{ width: p.size, height: p.size * 0.6, background: p.color }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
          animate={{ x: p.x, y: p.y + 40, opacity: 0, rotate: p.rot, scale: 1 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

/** "+12 XP" floating upward. */
export function FloatingXp({ amount }: { amount: number }) {
  return (
    <motion.div
      className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 text-2xl font-extrabold text-violet-600 drop-shadow dark:text-violet-200"
      initial={{ y: 0, opacity: 0, scale: 0.6 }}
      animate={{ y: -70, opacity: [0, 1, 1, 0], scale: 1.1 }}
      transition={{ duration: 1.2, ease: 'easeOut' }}
      aria-hidden
      dir="ltr"
    >
      +{amount} XP
    </motion.div>
  );
}
