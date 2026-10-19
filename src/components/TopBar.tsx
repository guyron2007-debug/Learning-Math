import { useGame } from '../store/gameStore';
import { currentStreak, playerLevel } from '../store/logic';
import { ProgressBar } from './ui';

export function TopBar() {
  const progress = useGame((s) => s.progress);
  const lvl = playerLevel(progress.xp);
  const streak = currentStreak(progress.practiceSeconds);
  return (
    <header className="sticky top-0 z-30 border-b border-violet-100 bg-white/80 px-4 py-2 backdrop-blur dark:border-violet-900 dark:bg-indigo-950/80">
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-200 to-fuchsia-200 text-3xl shadow-inner dark:from-violet-800 dark:to-fuchsia-900" aria-hidden>
          {progress.profile.avatar}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate font-bold">
              רמה {lvl.level} · {lvl.title}
            </span>
            <span className="shrink-0 text-xs text-violet-500 dark:text-violet-300" dir="ltr">
              {lvl.intoLevel}/{lvl.levelSize} XP
            </span>
          </div>
          <ProgressBar value={lvl.fraction} className="mt-1" label="התקדמות לרמה הבאה" />
        </div>
        <div className="flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-3 py-1 font-bold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200" title="מטבעות">
          🪙 <span>{progress.coins}</span>
        </div>
        <div className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1 font-bold ${streak ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-200' : 'bg-gray-100 text-gray-400 dark:bg-gray-800'}`} title="רצף ימים">
          <span className={streak ? 'flame' : 'grayscale'}>🔥</span> <span>{streak}</span>
        </div>
      </div>
    </header>
  );
}
