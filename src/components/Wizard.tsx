import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { HelpItem } from '../tutor/engine';
import { MathBlock, RichText } from './Math';
import { MathKeypad } from './MathKeypad';
import { Button } from './ui';

/** "🧙 עזרה מהקוסם" — twinkles (without opening) after a minute of no input. */
export function WizardButton({ onClick, nudge, disabled, label = 'עזרה מהקוסם' }: { onClick: () => void; nudge?: boolean; disabled?: boolean; label?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`shrink-0 rounded-full bg-violet-100 px-3 py-2 font-bold text-violet-800 transition hover:bg-violet-200 disabled:opacity-40 dark:bg-violet-900/60 dark:text-violet-100 ${nudge ? 'twinkle' : ''}`}
    >
      🧙 {label}
    </button>
  );
}

/** Dots for each step of the chosen solution path; finished steps are filled. Shows progress, never the answer. */
export function StepPath({ count, done, labels }: { count: number; done: number; labels?: string[] }) {
  if (count < 2) return null;
  return (
    <div className="flex items-center justify-center gap-1.5" aria-label={`צעד ${Math.min(done + 1, count)} מתוך ${count}`}>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          title={labels?.[i]}
          className={`h-3 w-3 rounded-full transition ${i < done ? 'bg-emerald-400' : i === done ? 'bg-violet-400 ring-4 ring-violet-200 dark:ring-violet-800' : 'bg-violet-100 dark:bg-violet-900'}`}
        />
      ))}
    </div>
  );
}

/** The empty box she fills in. */
const boxed = (latex: string) => latex.replace('\\square', '\\boxed{\\phantom{00}}');

interface BubbleProps {
  item: HelpItem;
  onMore: () => void;
  onClose: () => void;
  onBlank: (raw: string) => boolean;
  onShowSolution?: () => void;
}

/** The wizard and its speech bubble: one rung of help at a time, then she tries again. */
export function WizardBubble({ item, onMore, onClose, onBlank, onShowSolution }: BubbleProps) {
  const [value, setValue] = useState('');
  const [wrong, setWrong] = useState(false);
  // The key of the blank she just filled in correctly; the praise shows on the help that follows it.
  const [solvedKey, setSolvedKey] = useState<string | null>(null);
  const key = `${item.kind}-${'stepIndex' in item ? item.stepIndex : ''}-${'text' in item ? item.text : ''}`;
  const justSolved = solvedKey !== null && solvedKey !== key;

  useEffect(() => {
    setValue('');
    setWrong(false);
  }, [key]);

  const submitBlank = () => {
    if (!value) return;
    const ok = onBlank(value);
    setWrong(!ok);
    if (ok) setSolvedKey(key);
    setValue('');
  };
  const more = () => {
    setSolvedKey(null);
    onMore();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="my-4 flex items-start gap-3" role="dialog" aria-label="הקוסם">
      <motion.span className="text-5xl" animate={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 0.8 }} aria-hidden>
        🧙
      </motion.span>
      <div className="relative flex-1 rounded-3xl rounded-ss-md bg-violet-50 p-4 text-lg shadow-inner ring-2 ring-violet-200 dark:bg-violet-950 dark:ring-violet-800">
        {'step' in item && (
          <p className="mb-1 text-xs font-bold text-violet-500">
            צעד {item.stepIndex + 1} מתוך {item.stepCount} · {item.step.label}
          </p>
        )}
        <AnimatePresence mode="wait">
          <motion.div key={key} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
            {item.kind === 'hint' && <RichText text={item.text} />}
            {item.kind === 'subStep' && (
              <>
                <p className="mb-1 text-sm text-violet-500">נפרק את זה לצעדים קטנים:</p>
                <RichText text={item.text} />
              </>
            )}
            {item.kind === 'blank' && (
              <div>
                <p>השלימי את החסר:</p>
                <MathBlock latex={boxed(item.blank.latex)} className="text-center" />
                {wrong && <p className="mb-2 text-center text-rose-600 dark:text-rose-300">עוד לא. נסי שוב בעדינות 🙂</p>}
                <MathKeypad value={value} onChange={setValue} onSubmit={submitBlank} />
              </div>
            )}
            {item.kind === 'ready' && (
              <p>
                יפה! 🎉 {justSolved ? 'השלמת נכון. ' : ''}עכשיו הצעד האחרון — הוא שלך. נסי לענות על השאלה.
              </p>
            )}
            {item.kind === 'exhausted' && <p>עברנו יחד על כל הצעדים. אם עדיין קשה, אפשר לראות את הפתרון המלא — ואז השאלה תחזור אלייך עם מספרים אחרים.</p>}
          </motion.div>
        </AnimatePresence>
        {justSolved && item.kind !== 'ready' && <p className="mt-2 font-bold text-emerald-600 dark:text-emerald-300">נכון! ממשיכות לצעד הבא ✨</p>}

        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" className="min-h-10 flex-1 px-3 py-2 text-base" onClick={onClose}>
            הבנתי, אנסה
          </Button>
          {item.kind === 'exhausted'
            ? onShowSolution && (
                <Button className="min-h-10 flex-1 px-3 py-2 text-base" onClick={onShowSolution}>
                  הראי לי איך
                </Button>
              )
            : (
                <Button className="min-h-10 flex-1 px-3 py-2 text-base" onClick={more} silent>
                  עוד עזרה
                </Button>
              )}
        </div>
      </div>
    </motion.div>
  );
}

/** True once `ms` have passed without `activity` changing. */
export function useIdle(activity: unknown, ms: number, enabled: boolean) {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    setIdle(false);
    if (!enabled) return;
    const t = setTimeout(() => setIdle(true), ms);
    return () => clearTimeout(t);
  }, [activity, ms, enabled]);
  return idle;
}
