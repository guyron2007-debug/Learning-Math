import { useCallback, useState } from 'react';
import type { LevelDef } from '../../content/worlds';
import type { StepProblem } from '../../engine/types';
import type { SessionResult } from '../../store/logic';
import { ProgressBar } from '../../components/ui';
import { StepCard } from './StepCard';
import { ComboBadge } from './ComboBadge';
import { makeItem, useLevelDifficulty, useSession } from './session';

interface Props {
  level: LevelDef;
  onFinish: (result: SessionResult, xp: number) => void;
}

export function StepsLevel({ level, onFinish }: Props) {
  const session = useSession();
  const difficulty = useLevelDifficulty(level, 2);
  const next = (n: number) => makeItem(level.generators[n % level.generators.length], difficulty.adaptive.level) as StepProblem;
  const [n, setN] = useState(0);
  const [problem, setProblem] = useState<StepProblem>(() => next(0));

  const onStep = useCallback(
    (correct: boolean, hint: boolean) => {
      difficulty.record(correct);
      return session.record(problem, correct, hint ? 1 : 0);
    },
    [problem, session, difficulty],
  );

  const onDone = () => {
    if (n + 1 >= level.count) onFinish(session.result(), session.stats.xp);
    else {
      setN(n + 1);
      setProblem(next(n + 1));
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <span className="font-bold text-violet-600 dark:text-violet-300">
          תרגיל {n + 1}/{level.count}
        </span>
        <ProgressBar value={n / level.count} className="flex-1" label="התקדמות בשלב" />
        <ComboBadge combo={session.stats.combo} />
      </div>
      <StepCard key={n} problem={problem} onStep={onStep} onDone={onDone} doneLabel={n + 1 >= level.count ? 'לסיום השלב ←' : 'לתרגיל הבא ←'} />
    </div>
  );
}
