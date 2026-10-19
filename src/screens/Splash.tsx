import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useGame } from '../store/gameStore';
import { currentStreak } from '../store/logic';
import { Button } from '../components/ui';
import { play, unlockAudio } from '../audio/sound';

export function greeting(name: string, hour = new Date().getHours()) {
  const part = hour < 5 ? 'לילה טוב' : hour < 12 ? 'בוקר טוב' : hour < 17 ? 'צהריים טובים' : hour < 21 ? 'ערב טוב' : 'לילה טוב';
  return `${part}, ${name}!`;
}

export function Splash({ onDone }: { onDone: () => void }) {
  const progress = useGame((s) => s.progress);
  const [ready, setReady] = useState(false);
  const streak = currentStreak(progress.practiceSeconds);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 2200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-indigo-900 via-violet-800 to-fuchsia-700 p-6 text-center text-white">
      {Array.from({ length: 24 }, (_, i) => (
        <motion.span
          key={i}
          className="pointer-events-none absolute text-yellow-200"
          style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%`, fontSize: 8 + ((i * 7) % 14) }}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ repeat: Infinity, duration: 1.5 + (i % 5) * 0.4, delay: (i % 7) * 0.2 }}
        >
          ✦
        </motion.span>
      ))}
      <motion.div initial={{ scale: 0.3, rotate: -25, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 120, damping: 10 }} className="relative text-8xl">
        🪄
        <motion.span className="absolute -right-6 -top-4 text-5xl" animate={{ rotate: [0, 20, -10, 0], scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
          ✨
        </motion.span>
      </motion.div>
      <motion.h1 className="mt-6 text-5xl font-extrabold tracking-tight drop-shadow-lg sm:text-6xl" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
        אלגברה-קדברה
      </motion.h1>
      <motion.p className="mt-2 text-lg text-violet-200" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
        <span dir="ltr" className="font-serif italic">x² + magic = ∞</span>
      </motion.p>

      <motion.div className="mt-10 min-h-36" initial={{ opacity: 0, y: 20 }} animate={ready ? { opacity: 1, y: 0 } : {}}>
        <p className="text-3xl font-bold">{greeting(progress.profile.name)}</p>
        <p className="mt-2 text-xl text-violet-100">
          {streak > 0 ? `הלהבה שלך בוערת ${streak} ${streak === 1 ? 'יום' : 'ימים'} 🔥` : 'מוכנה להרפתקה מתמטית? ✨'}
        </p>
        <Button
          variant="gold"
          className="mt-6 px-10 text-xl"
          silent
          onClick={() => {
            unlockAudio();
            play('chest');
            onDone();
          }}
          autoFocus
        >
          יוצאות לדרך!
        </Button>
      </motion.div>
    </div>
  );
}
