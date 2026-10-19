import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { useCallback, useRef, useState } from 'react';
import { worldById, type LevelDef } from '../../content/worlds';
import type { PlayItem } from '../../engine/types';
import { AdaptiveDifficulty } from '../../engine/adaptive';
import type { SessionResult } from '../../store/logic';
import { pick } from '../../engine/rng';
import { Button, ProgressBar } from '../../components/ui';
import { Burst } from '../../components/Particles';
import { play } from '../../audio/sound';
import { QuestionCard } from './QuestionCard';
import { StepCard } from './StepCard';
import { ComboBadge } from './ComboBadge';
import { isStepGenerator, makeItem, useSession } from './session';

interface Props {
  level: LevelDef;
  onFinish: (result: SessionResult, xp: number) => void;
}

const TAUNTS = ['חה! זה כל מה שיש לך?', 'הגלים שלי חזקים מדי!', 'נסי שוב, מכשפונת!', 'בלבלתי אותך, הא?'];

export function BossFight({ level, onFinish }: Props) {
  const world = worldById(level.worldId);
  const session = useSession();
  const adaptive = useRef(new AdaptiveDifficulty(level.startDifficulty, level.startDifficulty, level.maxDifficulty));
  const questionGens = level.generators.filter((g) => !isStepGenerator(g));
  const stepGens = level.generators.filter(isStepGenerator);
  // Every third round is a multi-step "special attack".
  const next = (n: number): PlayItem =>
    makeItem(n % 3 === 2 && stepGens.length ? pick(Math.random, stepGens) : pick(Math.random, questionGens), adaptive.current.level);

  const [n, setN] = useState(0);
  const [item, setItem] = useState<PlayItem>(() => next(0));
  const [hp, setHp] = useState(level.count);
  const hpRef = useRef(level.count);
  const [taunt, setTaunt] = useState<string | null>(null);
  const [hitKey, setHitKey] = useState(0);
  const boss = useAnimationControls();
  const defeated = hp <= 0;

  const hit = useCallback(
    (correct: boolean) => {
      adaptive.current.record(correct);
      if (correct) {
        play('bossHit');
        setHitKey((k) => k + 1);
        setTaunt(null);
        void boss.start({ x: [0, -14, 12, -8, 0], filter: ['brightness(1)', 'brightness(2.2)', 'brightness(1)'], transition: { duration: 0.45 } });
        hpRef.current -= 1;
        setHp(hpRef.current);
        if (hpRef.current === 0) setTimeout(() => play('bossWin'), 300);
      } else {
        setTaunt(pick(Math.random, TAUNTS));
        void boss.start({ scale: [1, 1.25, 1], y: [0, 20, 0], transition: { duration: 0.5 } });
      }
    },
    [boss],
  );

  const onAnswer = useCallback(
    (correct: boolean, hints: number) => {
      hit(correct);
      return session.record(item, correct, hints);
    },
    [item, session, hit],
  );

  const onStep = useCallback(
    (correct: boolean, hint: boolean) => {
      hit(correct);
      return session.record(item, correct, hint ? 1 : 0);
    },
    [item, session, hit],
  );

  const advance = () => {
    if (defeated) return;
    setN(n + 1);
    setItem(next(n + 1));
  };

  return (
    <div>
      <div className="relative mb-4 overflow-hidden rounded-3xl bg-gradient-to-b from-indigo-900 to-sky-800 p-4 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="relative">
            <motion.div animate={boss} className="text-7xl drop-shadow-lg sm:text-8xl" style={{ opacity: defeated ? 0.3 : 1 }}>
              {world.bossEmoji ?? '👾'}
            </motion.div>
            <AnimatePresence>
              {hitKey > 0 && (
                <motion.span key={hitKey} className="absolute -top-2 left-1/2 text-2xl font-extrabold text-yellow-300" initial={{ y: 0, opacity: 1 }} animate={{ y: -40, opacity: 0 }} transition={{ duration: 0.8 }}>
                  -1
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <div className="flex-1">
            <div className="mb-1 flex justify-between font-bold">
              <span>{world.bossName}</span>
              <span>
                ❤️ {Math.max(0, hp)}/{level.count}
              </span>
            </div>
            <ProgressBar value={hp / level.count} color="from-rose-400 to-red-600" className="h-4 bg-white/20" label="חיי הבוס" />
            <div className="mt-2 flex min-h-7 items-center justify-between">
              <AnimatePresence mode="wait">
                {taunt && (
                  <motion.span key={taunt} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-sm italic text-sky-200">
                    "{taunt}"
                  </motion.span>
                )}
              </AnimatePresence>
              <ComboBadge combo={session.stats.combo} />
            </div>
          </div>
        </div>
      </div>

      {item.kind === 'question' ? (
        <QuestionCard key={n} question={item} onAnswer={onAnswer} onContinue={advance} autoAdvance />
      ) : (
        <div>
          <p className="mb-2 text-center font-bold text-fuchsia-600 dark:text-fuchsia-300">⚡ מתקפה מיוחדת: כל צעד נכון פוגע בבוס!</p>
          <StepCard key={n} problem={item} onStep={onStep} onDone={advance} />
        </div>
      )}

      <AnimatePresence>
        {defeated && (
          <motion.div className="fixed inset-0 z-40 flex items-center justify-center bg-indigo-950/70 p-4 backdrop-blur" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
            <motion.div className="relative w-full max-w-md rounded-3xl bg-gradient-to-b from-amber-100 to-yellow-200 p-8 text-center text-amber-950 shadow-2xl" initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ delay: 0.6, type: 'spring' }}>
              <Burst count={40} spread={200} />
              <div className="text-7xl">🏆</div>
              <h2 className="mt-3 text-3xl font-extrabold">ניצחת את {world.bossName}!</h2>
              <p className="mt-2">{world.name} שלך עכשיו.</p>
              <Button variant="gold" className="mt-6 w-full" onClick={() => onFinish(session.result(), session.stats.xp)}>
                לסיכום ולפרסים ←
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
