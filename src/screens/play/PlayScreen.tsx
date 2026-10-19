import { useCallback, useEffect, useRef, useState } from 'react';
import { LEVEL_TYPE_ICON, LEVEL_TYPE_LABEL, levelById, worldById } from '../../content/worlds';
import { useGame, type LevelSummary } from '../../store/gameStore';
import { isLevelUnlocked, type SessionResult } from '../../store/logic';
import { useUi } from '../../store/ui';
import { startMusic } from '../../audio/sound';
import { TreasureChestHost } from '../../components/TreasureChest';
import { SpeedRun } from './SpeedRun';
import { StepsLevel } from './StepsLevel';
import { BossFight } from './BossFight';
import { LevelComplete } from './LevelComplete';
import { usePracticeTimer } from './session';

export function PlayScreen({ levelId }: { levelId: string }) {
  const level = levelById(levelId)!;
  const world = worldById(level.worldId);
  const go = useUi((s) => s.go);
  const completeLevel = useGame((s) => s.completeLevel);
  const [run, setRun] = useState(0);
  const [summary, setSummary] = useState<LevelSummary | null>(null);
  const xpBefore = useRef(useGame.getState().progress.xp);
  const [xpAfter, setXpAfter] = useState(0);
  usePracticeTimer();

  useEffect(() => startMusic(world.id), [world.id]);

  const finish = useCallback(
    (result: SessionResult, xp: number) => {
      setSummary(completeLevel(level, result, xp));
      setXpAfter(useGame.getState().progress.xp);
    },
    [completeLevel, level],
  );

  const retry = () => {
    xpBefore.current = useGame.getState().progress.xp;
    setSummary(null);
    setRun(run + 1);
  };

  const idx = world.levels.findIndex((l) => l.id === level.id);
  const next = world.levels[idx + 1];
  const nextOpen = next && isLevelUnlocked(useGame.getState().progress, next) ? next : undefined;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-10 pt-4">
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => go({ name: 'world', worldId: world.id })}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-xl shadow dark:bg-violet-900"
          aria-label="יציאה מהשלב"
        >
          ✕
        </button>
        <div>
          <p className="text-sm text-violet-500">
            {world.emoji} {world.name} · {LEVEL_TYPE_ICON[level.type]} {LEVEL_TYPE_LABEL[level.type]}
          </p>
          <h1 className="text-xl font-extrabold">{level.title}</h1>
        </div>
      </div>

      {summary ? (
        <>
          <LevelComplete
            level={level}
            summary={summary}
            xpBefore={xpBefore.current}
            xpAfter={xpAfter}
            nextLevel={nextOpen}
            onNext={() => nextOpen && go({ name: 'play', levelId: nextOpen.id })}
            onRetry={retry}
            onMap={() => go({ name: 'world', worldId: world.id })}
          />
          <TreasureChestHost />
        </>
      ) : level.type === 'speed' ? (
        <SpeedRun key={run} level={level} onFinish={finish} />
      ) : level.type === 'steps' ? (
        <StepsLevel key={run} level={level} onFinish={finish} />
      ) : (
        <BossFight key={run} level={level} onFinish={finish} />
      )}
    </div>
  );
}
