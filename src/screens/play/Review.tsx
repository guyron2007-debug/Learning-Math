import { useCallback, useRef, useState } from 'react';
import type { PlayItem } from '../../engine/types';
import { useGame } from '../../store/gameStore';
import type { Mistake } from '../../store/types';
import { generators } from '../../generators';
import { Button, Card, ProgressBar, ScreenHeader } from '../../components/ui';
import { QuestionCard } from './QuestionCard';
import { StepCard } from './StepCard';
import { makeItem, usePracticeTimer, useSession } from './session';

const MAX_PER_SESSION = 6;

export function dueMistakes(mistakes: Mistake[], now = Date.now()) {
  return mistakes.filter((m) => m.dueAt <= now && generators[m.generatorId]);
}

/** "משימות תיקון": retry the kinds of questions that were missed earlier. */
export function Review({ onExit }: { onExit: () => void }) {
  usePracticeTimer();
  const resolveMistake = useGame((s) => s.resolveMistake);
  const [queue] = useState(() => dueMistakes(useGame.getState().progress.mistakes).slice(0, MAX_PER_SESSION));
  const session = useSession({ review: true });
  const [n, setN] = useState(0);
  const [item, setItem] = useState<PlayItem | null>(() => (queue[0] ? makeItem(queue[0].generatorId, queue[0].difficulty) : null));
  const [fixed, setFixed] = useState(0);
  const stepsAllRight = useRef(true);

  const mistake = queue[n];

  const onAnswer = useCallback(
    (correct: boolean, hints: number) => {
      resolveMistake(mistake.id, correct);
      if (correct) setFixed((f) => f + 1);
      return session.record(item!, correct, hints);
    },
    [item, mistake, resolveMistake, session],
  );

  const onStep = useCallback(
    (correct: boolean, hint: boolean) => {
      if (!correct) stepsAllRight.current = false;
      return session.record(item!, correct, hint ? 1 : 0);
    },
    [item, session],
  );

  const advance = () => {
    if (item?.kind === 'steps') {
      resolveMistake(mistake.id, stepsAllRight.current);
      if (stepsAllRight.current) setFixed((f) => f + 1);
    }
    stepsAllRight.current = true;
    const nextMistake = queue[n + 1];
    setN(n + 1);
    setItem(nextMistake ? makeItem(nextMistake.generatorId, nextMistake.difficulty) : null);
  };

  return (
    <div>
      <ScreenHeader title="🛠️ משימות תיקון" onBack={onExit} />
      {item ? (
        <>
          <div className="mb-4 flex items-center gap-3">
            <span className="font-bold text-violet-600">
              {n + 1}/{queue.length}
            </span>
            <ProgressBar value={n / queue.length} className="flex-1" />
          </div>
          {item.kind === 'question' ? (
            <QuestionCard key={n} question={item} onAnswer={onAnswer} onContinue={advance} />
          ) : (
            <StepCard key={n} problem={item} onStep={onStep} onDone={advance} />
          )}
        </>
      ) : (
        <Card className="text-center">
          <div className="text-6xl">{queue.length ? '🛠️✨' : '🌈'}</div>
          <p className="mt-3 text-xl font-bold">
            {queue.length ? `תיקנת ${fixed} מתוך ${queue.length}!` : 'אין כרגע משימות תיקון. כל הכבוד!'}
          </p>
          {queue.length > fixed && <p className="mt-1 text-violet-600">מה שלא הצליח יחזור מחר לניסיון נוסף.</p>}
          <Button className="mt-5 w-full" onClick={onExit}>
            חזרה הביתה
          </Button>
        </Card>
      )}
    </div>
  );
}
