import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Question } from '../../engine/types';
import { checkExpression, checkNumber } from '../../engine/check';
import { MathBlock, RichText } from '../../components/Math';
import { MathKeypad } from '../../components/MathKeypad';
import { Burst, FloatingXp } from '../../components/Particles';
import { Button, Card } from '../../components/ui';
import { StepPath, WizardBubble, WizardButton, useIdle } from '../../components/Wizard';
import { useGame } from '../../store/gameStore';
import { diagnose } from '../../tutor/engine';
import { SKILL_TIP } from '../../tutor/skills';
import { useTutor } from '../../tutor/useTutor';

interface Props {
  question: Question;
  /** Called once, on the first submitted answer (or when she gives up); returns the XP awarded. */
  onAnswer: (correct: boolean, hintsUsed: number) => number;
  onContinue: () => void;
  /** Move on automatically after a correct first answer without help (speed runs). */
  autoAdvance?: boolean;
}

type Status = 'answering' | 'correct' | 'gaveUp';

/** XP for solving after a mistake or with help — help never costs XP (spec B.1.5). */
const RECOVERY_XP = 6;
const HESITATION_MS = 60_000;

export const helpSummary = (n: number) =>
  n === 0 ? 'ניסית שוב והצלחת — לא ויתרת 🔥' : n === 1 ? 'השתמשת ברמז אחד.' : `השתמשת ב-${n} רמזים.`;

export function QuestionCard({ question, onAnswer, onContinue, autoAdvance }: Props) {
  const recordLearning = useGame((s) => s.recordLearning);
  const awardXp = useGame((s) => s.awardXp);
  const nudgeEnabled = useGame((s) => s.progress.settings.wizardNudge);
  const tutor = useTutor(question.solutionPaths, question.finalValues);

  const [input, setInput] = useState('');
  const [wrongPicks, setWrongPicks] = useState<number[]>([]);
  const [wrongCount, setWrongCount] = useState(0);
  const [lastDiagnosis, setLastDiagnosis] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('answering');
  const [showSolution, setShowSolution] = useState(false);
  const [xp, setXp] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);
  const answered = useRef(false);
  const firstDiagnosis = useRef<string | null>(null);
  const learned = useRef(false);
  const a = question.answer;

  // Parents re-render often (timers); keep the latest callback without restarting effects.
  const continueRef = useRef(onContinue);
  continueRef.current = onContinue;

  const finishLearning = useCallback(
    (correct: boolean) => {
      if (learned.current) return;
      learned.current = true;
      recordLearning({
        skills: question.skills,
        correct,
        // Fixing her own mistake without help counts like one small hint.
        helpRungs: Math.max(tutor.rungs, correct && wrongCount > 0 ? 1 : 0),
        misconception: firstDiagnosis.current,
        helpTypes: tutor.session?.shown,
      });
    },
    [question.skills, recordLearning, tutor.rungs, tutor.session, wrongCount],
  );

  const submit = useCallback(
    (choice?: number) => {
      if (status !== 'answering') return;
      let correct: boolean;
      let raw: string | number;
      if (a.kind === 'number') {
        if (!input) return;
        correct = checkNumber(input, a.value);
        raw = input;
      } else if (a.kind === 'expression') {
        if (!input) return;
        correct = checkExpression(input, a.value, a.variables);
        raw = input;
      } else {
        if (choice === undefined || wrongPicks.includes(choice)) return;
        correct = choice === a.correctIndex;
        raw = choice;
      }

      if (!answered.current) {
        answered.current = true;
        setXp(onAnswer(correct, tutor.helpCount));
      } else if (correct) {
        awardXp(RECOVERY_XP);
        setXp(RECOVERY_XP);
      }

      if (correct) {
        setStatus('correct');
        tutor.setOpen(false);
        finishLearning(true);
        return;
      }
      const code = diagnose(question, raw);
      if (firstDiagnosis.current === null) firstDiagnosis.current = code;
      setLastDiagnosis(code);
      setWrongCount((n) => n + 1);
      if (typeof raw === 'number') setWrongPicks((w) => [...w, raw as number]);
      setInput('');
      setShakeKey((k) => k + 1);
    },
    [a, input, wrongPicks, status, onAnswer, awardXp, tutor, finishLearning, question],
  );

  const giveUp = () => {
    if (!answered.current) {
      answered.current = true;
      onAnswer(false, tutor.helpCount);
    }
    finishLearning(false);
    setStatus('gaveUp');
    setShowSolution(true);
    tutor.setOpen(false);
  };

  const skip = () => {
    finishLearning(false);
    onContinue();
  };

  const cleanWin = status === 'correct' && wrongCount === 0 && tutor.helpCount === 0;

  useEffect(() => {
    if (cleanWin && autoAdvance) {
      const t = setTimeout(() => continueRef.current(), 1000);
      return () => clearTimeout(t);
    }
  }, [cleanWin, autoAdvance]);

  // Enter continues after the question is resolved (keyboard users).
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

  const idle = useIdle(`${input}|${wrongCount}|${tutor.open}`, HESITATION_MS, nudgeEnabled && status === 'answering' && !tutor.open);
  const item = tutor.item;
  const blankActive = tutor.open && item?.kind === 'blank';
  const stepsDone = !tutor.session ? 0 : tutor.session.mode === 'ready' || tutor.session.mode === 'exhausted' ? Infinity : tutor.session.stepIndex;
  const tipSkill = item && 'step' in item ? item.step.skill : question.skills[0];

  return (
    <Card className={`relative ${status === 'correct' ? 'ring-4 ring-emerald-400' : ''}`}>
      <div key={shakeKey} className={shakeKey ? 'shake' : ''}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-lg font-medium">
            <RichText text={question.prompt} />
          </p>
          {status === 'answering' && <WizardButton onClick={() => tutor.start()} nudge={idle} />}
        </div>

        {question.latex && <MathBlock latex={question.latex} className="my-4 text-center" />}
        {tutor.session && item && 'stepCount' in item && (
          <StepPath count={item.stepCount} done={Math.min(stepsDone, item.stepCount)} />
        )}

        {status === 'answering' && tutor.open && item && (
          <WizardBubble item={item} onMore={tutor.more} onClose={() => tutor.setOpen(false)} onBlank={tutor.fillBlank} onShowSolution={giveUp} />
        )}

        {status === 'answering' && wrongCount > 0 && !tutor.open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="my-3 rounded-2xl bg-rose-50 p-3 text-center dark:bg-rose-950/40">
            <p className="mb-2">לא בדיוק. אפשר לנסות שוב — או שננסה ביחד?</p>
            <div className="flex gap-2">
              <Button className="min-h-10 flex-1 px-3 py-2 text-base" onClick={() => tutor.start({ diagnosis: lastDiagnosis })} silent>
                🧙 בואי ננסה ביחד
              </Button>
              <Button variant="ghost" className="min-h-10 px-3 py-2 text-base" onClick={skip}>
                דלגי
              </Button>
            </div>
          </motion.div>
        )}

        <div className="mt-5">
          {a.kind === 'choice' ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {a.options.map((opt, i) => {
                const isCorrect = status !== 'answering' && i === a.correctIndex;
                const isWrongPick = wrongPicks.includes(i);
                return (
                  <button
                    key={i}
                    onClick={() => submit(i)}
                    disabled={status !== 'answering' || isWrongPick}
                    className={`min-h-16 rounded-2xl border-2 px-4 py-3 text-xl transition ${
                      isCorrect
                        ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/40'
                        : isWrongPick
                          ? 'border-rose-200 bg-rose-50 opacity-60 dark:bg-rose-950/40'
                          : 'border-violet-200 bg-white hover:border-violet-400 hover:bg-violet-50 dark:border-violet-800 dark:bg-violet-950'
                    }`}
                  >
                    <RichText text={opt} />
                  </button>
                );
              })}
            </div>
          ) : blankActive || status === 'gaveUp' ? null : (
            <MathKeypad
              value={input}
              onChange={setInput}
              onSubmit={() => submit()}
              mode={a.kind === 'expression' ? 'expression' : 'number'}
              disabled={status !== 'answering'}
            />
          )}
        </div>
      </div>

      {status === 'correct' && (
        <>
          <Burst key="burst" />
          {xp > 0 && <FloatingXp amount={xp} />}
          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-4 text-center">
            {cleanWin ? (
              <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-300">מעולה! ✨</p>
            ) : (
              <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 text-start dark:bg-emerald-950/40">
                <span className="text-4xl" aria-hidden>🧙</span>
                <div>
                  <p className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300">
                    פתרת בעצמך! 🎉 {helpSummary(tutor.helpCount)}
                  </p>
                  {tutor.helpCount > 0 && SKILL_TIP[tipSkill] && (
                    <p className="mt-1">
                      <RichText text={SKILL_TIP[tipSkill]!} />
                    </p>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}

      {showSolution && (
        <div className="mt-4 space-y-3">
          <motion.ol initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 rounded-2xl bg-sky-50 p-4 dark:bg-sky-950/40">
            {question.solution.map((line, i) => (
              <li key={i} className="flex gap-2">
                <span className="font-bold text-sky-600">{i + 1}.</span>
                <RichText text={line} />
              </li>
            ))}
          </motion.ol>
          <p className="text-center text-sm text-violet-600 dark:text-violet-300">🛠️ שאלה דומה, עם מספרים אחרים, תחכה לך במשימות התיקון.</p>
        </div>
      )}

      {status !== 'answering' && !(cleanWin && autoAdvance) && (
        <Button className="mt-4 w-full" onClick={onContinue} autoFocus>
          המשך ←
        </Button>
      )}
    </Card>
  );
}
