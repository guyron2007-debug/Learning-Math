import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import type { Step, StepProblem } from '../../engine/types';
import type { FinalValues } from '../../tutor/leak';
import { MathBlock, RichText } from '../../components/Math';
import { Burst, FloatingXp } from '../../components/Particles';
import { Button, Card } from '../../components/ui';
import { WizardBubble, WizardButton, useIdle } from '../../components/Wizard';
import { useGame } from '../../store/gameStore';
import { useTutor } from '../../tutor/useTutor';
import { helpSummary } from './QuestionCard';

interface Props {
  problem: StepProblem;
  /** Called the first time each step is answered (right or wrong); returns XP awarded. */
  onStep: (correctFirstTry: boolean, hintUsed: boolean) => number;
  onDone: () => void;
  /** Label for the button after the final step. */
  doneLabel?: string;
}

const RECOVERY_XP = 3;

interface StepResult {
  helpCount: number;
  firstTry: boolean;
}

/** One step of the problem, with its own wizard ladder. */
function CurrentStep({ step, index, finalValues, onSolved, onFirstAnswer }: {
  step: Step;
  index: number;
  finalValues: FinalValues;
  onSolved: (r: StepResult) => void;
  onFirstAnswer: (correct: boolean, helpUsed: boolean) => number;
}) {
  const recordLearning = useGame((s) => s.recordLearning);
  const awardXp = useGame((s) => s.awardXp);
  const nudgeEnabled = useGame((s) => s.progress.settings.wizardNudge);
  const paths = useMemo(() => [{ id: 'step', title: step.help.label, steps: [step.help] }], [step]);
  const tutor = useTutor(paths, finalValues);
  const [wrongPicks, setWrongPicks] = useState<number[]>([]);
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [firstCode, setFirstCode] = useState<string | null>(null);
  const [solved, setSolved] = useState(false);
  const [xp, setXp] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);
  const idle = useIdle(`${wrongPicks.length}|${tutor.open}`, 60_000, nudgeEnabled && !solved && !tutor.open);

  const pick = (i: number) => {
    if (solved || wrongPicks.includes(i)) return;
    const first = wrongPicks.length === 0;
    if (i === step.correctIndex) {
      setSolved(true);
      tutor.setOpen(false);
      let gained = first ? onFirstAnswer(true, tutor.helpCount > 0) : 0;
      if (!first) {
        awardXp(RECOVERY_XP);
        gained = RECOVERY_XP;
      }
      setXp(gained);
      recordLearning({
        skills: [step.help.skill],
        correct: true,
        helpRungs: Math.max(tutor.rungs, first ? 0 : 1),
        misconception: firstCode,
        helpTypes: tutor.session?.shown,
      });
      onSolved({ helpCount: tutor.helpCount, firstTry: first });
    } else {
      if (first) onFirstAnswer(false, tutor.helpCount > 0);
      const code = step.optionCodes[i];
      if (first) setFirstCode(code);
      setLastCode(code);
      setWrongPicks([...wrongPicks, i]);
      setShakeKey((k) => k + 1);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="text-lg font-bold">
          <span className="text-violet-500">צעד {index + 1}: </span>
          <RichText text={step.prompt} />
        </p>
        {!solved && <WizardButton onClick={() => tutor.start()} nudge={idle} label="עזרה" />}
      </div>

      {!solved && tutor.open && tutor.item && (
        <WizardBubble item={tutor.item} onMore={tutor.more} onClose={() => tutor.setOpen(false)} onBlank={tutor.fillBlank} />
      )}

      {!solved && wrongPicks.length > 0 && !tutor.open && (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-2xl bg-rose-50 p-3 dark:bg-rose-950/40">
          <span>לא הצעד הזה. נסי אפשרות אחרת — או שננסה ביחד?</span>
          <Button className="min-h-10 shrink-0 px-3 py-2 text-base" onClick={() => tutor.start({ diagnosis: lastCode })} silent>
            🧙 ביחד
          </Button>
        </div>
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

      {solved && (
        <div className="relative mt-4">
          {xp > 0 && (
            <>
              <Burst count={12} spread={100} />
              <FloatingXp amount={xp} />
            </>
          )}
          <p className="rounded-2xl bg-emerald-50 p-3 dark:bg-emerald-950/40">
            ✅ <RichText text={step.explanation} />
          </p>
        </div>
      )}
    </motion.div>
  );
}

export function StepCard({ problem, onStep, onDone, doneLabel = 'המשך ←' }: Props) {
  const [index, setIndex] = useState(0);
  const [solved, setSolved] = useState(false);
  const [results, setResults] = useState<StepResult[]>([]);
  const finished = solved && index === problem.steps.length - 1;
  const totalHelp = results.reduce((s, r) => s + r.helpCount, 0);
  const allAlone = results.every((r) => r.firstTry && r.helpCount === 0);

  const next = () => {
    if (finished) return onDone();
    setIndex(index + 1);
    setSolved(false);
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

      <CurrentStep
        key={index}
        step={problem.steps[index]}
        index={index}
        finalValues={problem.finalValues}
        onFirstAnswer={onStep}
        onSolved={(r) => {
          setResults((prev) => [...prev, r]);
          setSolved(true);
        }}
      />

      {solved && (
        <>
          {finished && (
            <div className="mt-3 text-center">
              <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-300">
                פתרת! <RichText text={problem.finalAnswer} />
              </p>
              {!allAlone && <p className="mt-1">🧙 פתרת בעצמך! {helpSummary(totalHelp)}</p>}
            </div>
          )}
          <Button className="mt-3 w-full" onClick={next} autoFocus>
            {finished ? doneLabel : 'לצעד הבא ←'}
          </Button>
        </>
      )}
    </Card>
  );
}
