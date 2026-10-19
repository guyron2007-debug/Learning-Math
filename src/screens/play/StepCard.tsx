import { motion } from 'framer-motion';
import { useState } from 'react';
import type { StepProblem } from '../../engine/types';
import { MathBlock, RichText } from '../../components/Math';
import { Burst, FloatingXp } from '../../components/Particles';
import { Button, Card } from '../../components/ui';
import { play } from '../../audio/sound';

interface Props {
  problem: StepProblem;
  /** Called the first time each step is answered (right or wrong); returns XP awarded. */
  onStep: (correctFirstTry: boolean, hintUsed: boolean) => number;
  onDone: () => void;
  /** Label for the button after the final step. */
  doneLabel?: string;
}

export function StepCard({ problem, onStep, onDone, doneLabel = 'המשך ←' }: Props) {
  const [index, setIndex] = useState(0);
  const [wrongPicks, setWrongPicks] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);
  const [hint, setHint] = useState(false);
  const [xp, setXp] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);
  const step = problem.steps[index];
  const finished = solved && index === problem.steps.length - 1;

  const pick = (i: number) => {
    if (solved || wrongPicks.includes(i)) return;
    const firstAttempt = wrongPicks.length === 0;
    if (i === step.correctIndex) {
      setSolved(true);
      const gained = firstAttempt ? onStep(true, hint) : 0;
      setXp(gained);
    } else {
      if (firstAttempt) onStep(false, hint);
      setWrongPicks([...wrongPicks, i]);
      setHint(true);
      setShakeKey((k) => k + 1);
    }
  };

  const next = () => {
    if (finished) return onDone();
    setIndex(index + 1);
    setWrongPicks([]);
    setSolved(false);
    setHint(false);
    setXp(0);
  };

  return (
    <Card className="relative">
      <p className="text-lg font-medium">
        <RichText text={problem.prompt} />
      </p>
      <MathBlock latex={problem.latex} className="my-3 text-center" />

      <div className="mb-4 flex justify-center gap-2" aria-label={`צעד ${index + 1} מתוך ${problem.steps.length}`}>
        {problem.steps.map((_, i) => (
          <span key={i} className={`h-2.5 w-10 rounded-full ${i < index || (i === index && solved) ? 'bg-emerald-400' : i === index ? 'bg-violet-400' : 'bg-violet-100 dark:bg-violet-900'}`} />
        ))}
      </div>

      {index > 0 && (
        <ol className="mb-4 space-y-1 border-s-4 border-emerald-300 ps-3 text-violet-700 dark:text-violet-300">
          {problem.steps.slice(0, index).map((s, i) => (
            <li key={i}>
              <RichText text={s.summary ?? s.options[s.correctIndex]} />
            </li>
          ))}
        </ol>
      )}

      <motion.div key={index} initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <p className="text-lg font-bold">
            <span className="text-violet-500">צעד {index + 1}: </span>
            <RichText text={step.prompt} />
          </p>
          <button
            onClick={() => {
              play('hint');
              setHint(true);
            }}
            disabled={hint || solved}
            className="shrink-0 rounded-full bg-amber-100 px-3 py-2 font-bold text-amber-800 disabled:opacity-40 dark:bg-amber-900/50 dark:text-amber-200"
            aria-label="רמז"
          >
            💡
          </button>
        </div>
        {hint && !solved && (
          <p className="mb-3 rounded-2xl bg-amber-50 p-3 dark:bg-amber-950/40">
            💡 <RichText text={step.hint} />
          </p>
        )}

        <div key={shakeKey} className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${shakeKey ? 'shake' : ''}`}>
          {step.options.map((opt, i) => {
            const isRight = solved && i === step.correctIndex;
            const isWrong = wrongPicks.includes(i);
            return (
              <button
                key={i}
                onClick={() => pick(i)}
                disabled={solved || isWrong}
                className={`min-h-16 rounded-2xl border-2 px-3 py-3 text-lg transition ${
                  isRight
                    ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/40'
                    : isWrong
                      ? 'border-rose-200 bg-rose-50 opacity-60 dark:bg-rose-950/40'
                      : 'border-violet-200 bg-white hover:border-violet-400 hover:bg-violet-50 dark:border-violet-800 dark:bg-violet-950'
                }`}
              >
                <RichText text={opt} />
              </button>
            );
          })}
        </div>
      </motion.div>

      {solved && (
        <div className="relative mt-4">
          {xp > 0 && (
            <>
              <Burst key={`b${index}`} count={12} spread={100} />
              <FloatingXp amount={xp} />
            </>
          )}
          <p className="rounded-2xl bg-emerald-50 p-3 dark:bg-emerald-950/40">
            ✅ <RichText text={step.explanation} />
          </p>
          {finished && (
            <p className="mt-3 text-center text-xl font-extrabold text-emerald-600 dark:text-emerald-300">
              פתרת! <RichText text={problem.finalAnswer} />
            </p>
          )}
          <Button className="mt-3 w-full" onClick={next} autoFocus>
            {finished ? doneLabel : 'לצעד הבא ←'}
          </Button>
        </div>
      )}
    </Card>
  );
}
