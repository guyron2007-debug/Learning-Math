import { useCallback, useRef, useState } from 'react';
import type { LevelDef } from '../../content/worlds';
import type { Question } from '../../engine/types';
import { AdaptiveDifficulty } from '../../engine/adaptive';
import type { SessionResult } from '../../store/logic';
import { ProgressBar } from '../../components/ui';
import { QuestionCard } from './QuestionCard';
import { ComboBadge } from './ComboBadge';
import { makeItem, useElapsedSeconds, useSession } from './session';

interface Props {
  level: LevelDef;
  onFinish: (result: SessionResult, xp: number) => void;
}

export function SpeedRun({ level, onFinish }: Props) {
  const session = useSession();
  const adaptive = useRef(new AdaptiveDifficulty(level.startDifficulty, 1, level.maxDifficulty));
  const offset = useRef(Math.floor(Math.random() * level.generators.length));
  const next = (n: number) => makeItem(level.generators[(n + offset.current) % level.generators.length], adaptive.current.level) as Question;
  const [n, setN] = useState(0);
  const [question, setQuestion] = useState<Question>(() => next(0));
  const elapsed = useElapsedSeconds();
  const limit = level.timeLimit ?? 0;
  const remaining = Math.max(0, limit - elapsed);

  const onAnswer = useCallback(
    (correct: boolean, hints: number) => {
      adaptive.current.record(correct);
      return session.record(question, correct, hints);
    },
    [question, session],
  );

  const onContinue = () => {
    if (n + 1 >= level.count) {
      onFinish(session.result(level.timeLimit), session.stats.xp);
    } else {
      setN(n + 1);
      setQuestion(next(n + 1));
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <span className="font-bold text-violet-600 dark:text-violet-300">
          {n + 1}/{level.count}
        </span>
        <ProgressBar value={n / level.count} className="flex-1" label="התקדמות בשלב" />
        <ComboBadge combo={session.stats.combo} />
      </div>
      {limit > 0 && (
        <div className="mb-4 flex items-center gap-2 text-sm">
          <span aria-hidden>⏱️</span>
          <ProgressBar value={remaining / limit} className="h-2 flex-1" color={remaining > limit * 0.3 ? 'from-sky-300 to-sky-500' : 'from-orange-300 to-rose-500'} label="זמן בונוס" />
          <span className="w-24 text-start text-violet-500" dir="ltr">
            {remaining > 0 ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}` : 'בלי בונוס'}
          </span>
        </div>
      )}
      <QuestionCard key={n} question={question} onAnswer={onAnswer} onContinue={onContinue} autoAdvance />
    </div>
  );
}
