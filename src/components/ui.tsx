import { motion, AnimatePresence } from 'framer-motion';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { play } from '../audio/sound';

type Variant = 'primary' | 'secondary' | 'ghost' | 'success' | 'danger' | 'gold';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-gradient-to-b from-violet-500 to-violet-700 text-white shadow-[0_4px_0_#4c1d95] active:shadow-none active:translate-y-1',
  secondary: 'bg-white text-violet-800 border-2 border-violet-200 shadow-[0_4px_0_#ddd6fe] active:shadow-none active:translate-y-1 dark:bg-violet-950 dark:text-violet-100 dark:border-violet-800 dark:shadow-[0_4px_0_#2e1065]',
  ghost: 'text-violet-700 hover:bg-violet-100 dark:text-violet-200 dark:hover:bg-violet-900/50',
  success: 'bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-[0_4px_0_#065f46] active:shadow-none active:translate-y-1',
  danger: 'bg-gradient-to-b from-rose-400 to-rose-600 text-white shadow-[0_4px_0_#9f1239] active:shadow-none active:translate-y-1',
  gold: 'bg-gradient-to-b from-amber-300 to-amber-500 text-amber-950 shadow-[0_4px_0_#b45309] active:shadow-none active:translate-y-1',
};

export function Button({
  variant = 'primary',
  className = '',
  silent,
  onClick,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; silent?: boolean }) {
  return (
    <button
      {...rest}
      onClick={(e) => {
        if (!silent) play('click');
        onClick?.(e);
      }}
      className={`min-h-12 rounded-2xl px-5 py-3 text-lg font-bold transition disabled:opacity-40 disabled:shadow-none ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl bg-white/90 p-5 shadow-lg shadow-violet-200/50 ring-1 ring-violet-100 backdrop-blur dark:bg-violet-950/70 dark:shadow-black/30 dark:ring-violet-900 ${className}`}>
      {children}
    </div>
  );
}

export function ProgressBar({ value, className = '', color = 'from-violet-400 to-fuchsia-500', label }: { value: number; className?: string; color?: string; label?: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className={`h-3 overflow-hidden rounded-full bg-violet-100 dark:bg-violet-900 ${className}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <motion.div className={`h-full rounded-full bg-gradient-to-l ${color}`} initial={false} animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
    </div>
  );
}

export function Stars({ count, size = 'text-xl' }: { count: number; size?: string }) {
  return (
    <span className={`${size} tracking-tight`} aria-label={`${count} כוכבים`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={i < count ? '' : 'opacity-25 grayscale'}>⭐</span>
      ))}
    </span>
  );
}

export function Modal({ open, children, onClose }: { open: boolean; children: ReactNode; onClose?: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-950/60 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="max-h-[90dvh] w-full max-w-lg overflow-y-auto"
            initial={{ scale: 0.85, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ScreenHeader({ title, onBack, children }: { title: ReactNode; onBack?: () => void; children?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      {onBack && (
        <button onClick={() => { play('click'); onBack(); }} className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-xl shadow dark:bg-violet-900" aria-label="חזרה">
          →
        </button>
      )}
      <h1 className="flex-1 text-2xl font-extrabold">{title}</h1>
      {children}
    </div>
  );
}
