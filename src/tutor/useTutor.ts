import { useCallback, useState } from 'react';
import { useGame } from '../store/gameStore';
import { play } from '../audio/sound';
import { answerBlank, currentHelp, helpRungs, moreHelp, startSession, type HelpItem, type TutorSession } from './engine';
import type { FinalValues } from './leak';
import type { SolutionPath } from './types';

/** Holds one question's help session for the UI. */
export function useTutor(paths: SolutionPath[], finalValues: FinalValues) {
  const learner = useGame((s) => s.progress.learner);
  const [session, setSession] = useState<TutorSession | null>(null);
  const [open, setOpen] = useState(false);

  const start = useCallback(
    (opts: { diagnosis?: string | null; fromStep?: number } = {}) => {
      play('magic');
      setOpen(true);
      // A session already running keeps its place on the ladder.
      setSession((s) => s ?? startSession(paths, learner, opts));
    },
    [paths, learner],
  );

  const more = useCallback(() => {
    play('hint');
    setSession((s) => (s ? moreHelp(paths, s, learner) : s));
  }, [paths, learner]);

  const fillBlank = useCallback(
    (raw: string) => {
      if (!session) return false;
      const res = answerBlank(paths, session, raw, learner);
      play(res.correct ? 'correct' : 'wrong');
      setSession(res.session);
      return res.correct;
    },
    [paths, session, learner],
  );

  const item: HelpItem | null = session ? currentHelp(paths, session, finalValues) : null;
  return {
    session,
    item,
    open,
    setOpen,
    start,
    more,
    fillBlank,
    /** Help items shown so far (each one costs a little toward stars, never XP). */
    helpCount: session?.shown.length ?? 0,
    rungs: helpRungs(session),
    exhausted: session?.mode === 'exhausted',
  };
}
