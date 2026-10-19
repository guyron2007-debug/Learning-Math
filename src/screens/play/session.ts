import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { generators } from '../../generators';
import { defaultRng } from '../../engine/rng';
import { clampDifficulty, type Difficulty, type PlayItem } from '../../engine/types';
import { useGame } from '../../store/gameStore';
import type { SessionResult } from '../../store/logic';
import { play } from '../../audio/sound';

export function makeItem(generatorId: string, difficulty: Difficulty): PlayItem {
  const def = generators[generatorId];
  if (!def) throw new Error(`Unknown generator ${generatorId}`);
  return def.generate(clampDifficulty(difficulty, def.minDifficulty, def.maxDifficulty), defaultRng);
}

export const isStepGenerator = (id: string) => id.startsWith('steps.');

export interface SessionStats {
  correctFirstTry: number;
  total: number;
  hintsUsed: number;
  combo: number;
  maxCombo: number;
  xp: number;
}

/** Tracks a play session's score and reports each answer to the store. */
export function useSession(options: { review?: boolean } = {}) {
  const recordAnswer = useGame((s) => s.recordAnswer);
  const stats = useRef<SessionStats>({ correctFirstTry: 0, total: 0, hintsUsed: 0, combo: 0, maxCombo: 0, xp: 0 });
  const startedAt = useRef(Date.now());
  const [, rerender] = useReducer((x: number) => x + 1, 0);

  const record = useCallback(
    (item: PlayItem, correct: boolean, hintsUsed: number) => {
      const s = stats.current;
      s.total++;
      s.hintsUsed += hintsUsed;
      if (correct) {
        s.correctFirstTry++;
        s.combo++;
        s.maxCombo = Math.max(s.maxCombo, s.combo);
      } else {
        s.combo = 0;
      }
      const xp = recordAnswer({ topic: item.topic, generatorId: item.generatorId, difficulty: item.difficulty, correct, combo: s.combo, review: options.review });
      s.xp += xp;
      if (!correct) play('wrong');
      else if (s.combo >= 3) play('combo', s.combo);
      else play('correct');
      rerender();
      return xp;
    },
    [recordAnswer, options.review],
  );

  const result = useCallback(
    (timeLimit?: number): SessionResult => ({
      correctFirstTry: stats.current.correctFirstTry,
      total: stats.current.total,
      hintsUsed: stats.current.hintsUsed,
      maxCombo: stats.current.maxCombo,
      seconds: (Date.now() - startedAt.current) / 1000,
      timeLimit,
    }),
    [],
  );

  return useMemo(() => ({ stats: stats.current, record, result }), [record, result]);
}

export function useElapsedSeconds(running = true) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!running) return;
    const start = Date.now() - seconds * 1000;
    const t = setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 500);
    return () => clearInterval(t);
  }, [running]); // `seconds` is only read to resume after a pause
  return seconds;
}

/** Adds practice time to today's total while the page is visible. */
export function usePracticeTimer() {
  const addPracticeSeconds = useGame((s) => s.addPracticeSeconds);
  useEffect(() => {
    const TICK = 10;
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') addPracticeSeconds(TICK);
    }, TICK * 1000);
    return () => clearInterval(t);
  }, [addPracticeSeconds]);
}
