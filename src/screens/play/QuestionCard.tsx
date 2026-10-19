import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Question } from '../../engine/types';
import { checkExpression, checkNumber } from '../../engine/check';
import { MathBlock, RichText } from '../../components/Math';
import { MathKeypad } from '../../components/MathKeypad';
import { Burst, FloatingXp } from '../../components/Particles';
import { Button, Card } from '../../components/ui';
import { play } from '../../audio/sound';

interface Props {
  question: Question;
  /** Called once when the answer is submitted; returns the XP awarded. */
  onAnswer: (correct: boolean, hintsUsed: number) => number;
  onContinue: () => void;
  /** Move on automatically after a correct answer (speed runs). */
  autoAdvance?: boolean;
}

type Status = 'answering' | 'correct' | 'wrong';

export function HintBox({ hints, shown }: { hints: string[]; shown: number }) {
  return (
    <AnimatePresence>
      {shown > 0 && (
        <motion.ol initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-3 space-y-2 overflow-hidden rounded-2xl bg-amber-50 p-3 text-start dark:bg-amber-950/40">
          {hints.slice(0, shown).map((h, i) => (
            <motion.li key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2">
              <span>💡</span>
              <RichText text={h} />
            </motion.li>
          ))}
        </motion.ol>
      )}
    </AnimatePresence>
  );
}

export function QuestionCard({ question, onAnswer, onContinue, autoAdvance }: Props) {
  const [input, setInput] = useState('');
  const [picked, setPicked] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>('answering');
  const [hints, setHints] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [xp, setXp] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);
  const a = question.answer;
  // Parents re-render often (timers); keep the latest callback without restarting effects.
  const continueRef = useRef(onContinue);
  continueRef.current = onContinue;

  const submit = useCallback(
    (choice?: number) => {
      if (status !== 'answering') return;
      let correct = false;
      if (a.kind === 'number') {
        if (!input) return;
        correct = checkNumber(input, a.value);
      } else if (a.kind === 'expression') {
        if (!input) return;
        correct = checkExpression(input, a.value, a.variables);
      } else {
        if (choice === undefined) return;
        setPicked(choice);
        correct = choice === a.correctIndex;
      }
      setStatus(correct ? 'correct' : 'wrong');
      setXp(onAnswer(correct, hints));
      if (!correct) setShakeKey((k) => k + 1);
    },
    [a, input, hints, onAnswer, status],
  );

  useEffect(() => {
    if (status === 'correct' && autoAdvance) {
      const t = setTimeout(() => continueRef.current(), 1000);
      return () => clearTimeout(t);
    }
  }, [status, autoAdvance]);

  // Enter continues after feedback (keyboard users).
  useEffect(() => {
    if (status === 'answering') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        continueRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [status]);

  const correctText = a.kind === 'choice' ? a.options[a.correctIndex] : `$${a.display}$`;

  return (
    <Card className={`relative ${status === 'correct' ? 'ring-4 ring-emerald-400' : ''} ${status === 'wrong' ? 'ring-4 ring-rose-300' : ''}`}>
      <div key={shakeKey} className={shakeKey ? 'shake' : ''}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-lg font-medium">
            <RichText text={question.prompt} />
          </p>
          <button
            onClick={() => {
              if (hints < question.hints.length) {
                play('hint');
                setHints(hints + 1);
              }
            }}
            disabled={hints >= question.hints.length || status !== 'answering'}
            className="shrink-0 rounded-full bg-amber-100 px-3 py-2 font-bold text-amber-800 transition hover:bg-amber-200 disabled:opacity-40 dark:bg-amber-900/50 dark:text-amber-200"
            aria-label={`רמז, נשארו ${question.hints.length - hints}`}
          >
            💡 {question.hints.length - hints}
          </button>
        </div>

        {question.latex && <MathBlock latex={question.latex} className="my-4 text-center" />}
        <HintBox hints={question.hints} shown={hints} />

        <div className="mt-5">
          {a.kind === 'choice' ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {a.options.map((opt, i) => {
                const isCorrect = status !== 'answering' && i === a.correctIndex;
                const isWrongPick = status === 'wrong' && i === picked;
                return (
                  <button
                    key={i}
                    onClick={() => submit(i)}
                    disabled={status !== 'answering'}
                    className={`min-h-16 rounded-2xl border-2 px-4 py-3 text-xl transition ${
                      isCorrect
                        ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/40'
                        : isWrongPick
                          ? 'border-rose-300 bg-rose-50 dark:bg-rose-900/40'
                          : 'border-violet-200 bg-white hover:border-violet-400 hover:bg-violet-50 dark:border-violet-800 dark:bg-violet-950'
                    }`}
                  >
                    <RichText text={opt} />
                  </button>
                );
              })}
            </div>
          ) : (
            <MathKeypad value={input} onChange={setInput} onSubmit={() => submit()} mode={a.kind === 'expression' ? 'expression' : 'number'} disabled={status !== 'answering'} />
          )}
        </div>
      </div>

      {status === 'correct' && (
        <>
          <Burst key="burst" />
          {xp > 0 && <FloatingXp amount={xp} />}
          <motion.p initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-4 text-center text-2xl font-extrabold text-emerald-600 dark:text-emerald-300">
            מעולה! ✨
          </motion.p>
        </>
      )}

      {status !== 'answering' && !(status === 'correct' && autoAdvance) && (
        <div className="mt-4 space-y-3">
          {status === 'wrong' && (
            <p className="text-center text-lg">
              כמעט! התשובה הנכונה: <RichText text={correctText} className="font-bold" />
            </p>
          )}
          {showSolution && (
            <motion.ol initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 rounded-2xl bg-sky-50 p-4 dark:bg-sky-950/40">
              {question.solution.map((line, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-bold text-sky-600">{i + 1}.</span>
                  <RichText text={line} />
                </li>
              ))}
            </motion.ol>
          )}
          <div className="flex gap-3">
            {!showSolution && (
              <Button variant="secondary" className="flex-1" onClick={() => setShowSolution(true)}>
                הראי לי איך
              </Button>
            )}
            <Button className="flex-1" onClick={onContinue} autoFocus>
              המשך ←
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
