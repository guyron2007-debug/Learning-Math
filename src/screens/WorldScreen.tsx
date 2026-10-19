import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { LEVEL_TYPE_ICON, LEVEL_TYPE_LABEL, worldById, type WorldId } from '../content/worlds';
import { useGame } from '../store/gameStore';
import { isLevelUnlocked } from '../store/logic';
import { useUi } from '../store/ui';
import { ScreenHeader, Stars } from '../components/ui';
import { play, startMusic } from '../audio/sound';

export function WorldScreen({ worldId }: { worldId: WorldId }) {
  const world = worldById(worldId);
  const progress = useGame((s) => s.progress);
  const go = useUi((s) => s.go);
  useEffect(() => startMusic(world.id), [world.id]);

  return (
    <div>
      <ScreenHeader title={`${world.emoji} ${world.name}`} onBack={() => go({ name: 'map' })} />
      <div className={`mb-6 rounded-3xl bg-gradient-to-br ${world.gradient} p-5 text-white shadow-lg`}>
        <p className="text-lg font-bold">{world.topicTitle}</p>
        <p className="opacity-90">{world.description}</p>
      </div>
      <ol className="relative mx-auto max-w-md">
        {world.levels.map((level, i) => {
          const unlocked = isLevelUnlocked(progress, level);
          const stars = progress.levelStars[level.id] ?? 0;
          const boss = level.type === 'boss';
          const offset = boss ? 0 : [0, 60, 80, 40, -20, -70, -50, 10][i % 8];
          return (
            <li key={level.id} className="relative flex flex-col items-center pb-6" style={{ transform: `translateX(${offset}px)` }}>
              <motion.button
                whileHover={unlocked ? { scale: 1.08 } : {}}
                whileTap={unlocked ? { scale: 0.92 } : {}}
                disabled={!unlocked}
                onClick={() => {
                  play('click');
                  go({ name: 'play', levelId: level.id });
                }}
                className={`flex items-center justify-center rounded-full border-4 shadow-lg transition ${boss ? 'h-28 w-28 text-6xl' : 'h-20 w-20 text-4xl'} ${
                  unlocked ? (stars ? `border-amber-300 bg-gradient-to-br ${world.gradient}` : `animate-pulse border-white bg-gradient-to-br ${world.gradient}`) : 'border-gray-300 bg-gray-200 grayscale dark:border-gray-700 dark:bg-gray-800'
                }`}
                aria-label={`${level.title}, ${LEVEL_TYPE_LABEL[level.type]}${unlocked ? '' : ' — נעול'}`}
              >
                {unlocked ? (boss ? world.bossEmoji : LEVEL_TYPE_ICON[level.type]) : '🔒'}
              </motion.button>
              <span className="mt-1 text-center text-sm font-bold">{level.title}</span>
              <span className="text-xs text-violet-500">{LEVEL_TYPE_LABEL[level.type]}</span>
              {unlocked && <Stars count={stars} size="text-base" />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
