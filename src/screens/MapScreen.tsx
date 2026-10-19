import { motion } from 'framer-motion';
import { useGame } from '../store/gameStore';
import { isWorldUnlocked, orderedWorlds, worldHasContent } from '../store/logic';
import { useUi } from '../store/ui';
import { play } from '../audio/sound';

const ROW = 150;

export function MapScreen() {
  const progress = useGame((s) => s.progress);
  const go = useUi((s) => s.go);
  const worlds = orderedWorlds(progress);
  const height = worlds.length * ROW + 60;
  const points = worlds.map((_, i) => ({ x: i % 2 === 0 ? 30 : 70, y: 80 + i * ROW }));
  const path = points.reduce((d, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const midY = (prev.y + p.y) / 2;
    return `${d} C ${prev.x} ${midY}, ${p.x} ${midY}, ${p.x} ${p.y}`;
  }, '');

  return (
    <div>
      <h1 className="mb-4 text-2xl font-extrabold">🗺️ מפת העולמות</h1>
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-sky-200 via-teal-100 to-amber-100 shadow-inner dark:from-sky-950 dark:via-teal-950 dark:to-indigo-950" style={{ height }}>
        {['☁️', '🐚', '🌴', '⛵', '🐠', '☁️', '🌵', '🦜'].map((e, i) => (
          <span key={i} className="pointer-events-none absolute text-3xl opacity-40" style={{ top: 40 + i * (height / 8), [i % 2 ? 'left' : 'right']: `${8 + (i * 13) % 20}%` }} aria-hidden>
            {e}
          </span>
        ))}
        <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" aria-hidden>
          <path d={path} fill="none" stroke="#a78bfa" strokeWidth="6" strokeDasharray="2 14" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
        {worlds.map((w, i) => {
          const unlocked = isWorldUnlocked(progress, w.id);
          const ready = worldHasContent(w);
          const stars = w.levels.reduce((s, l) => s + (progress.levelStars[l.id] ?? 0), 0);
          const beaten = !!progress.bossDefeated[w.id];
          return (
            <motion.button
              key={w.id}
              className="absolute flex w-40 -translate-x-1/2 -translate-y-1/2 flex-col items-center"
              style={{ left: `${points[i].x}%`, top: points[i].y }}
              whileHover={unlocked && ready ? { scale: 1.06 } : {}}
              whileTap={unlocked && ready ? { scale: 0.95 } : {}}
              onClick={() => {
                play('click');
                if (unlocked && ready) go({ name: 'world', worldId: w.id });
              }}
              aria-label={`${w.name}${!ready ? ' — בקרוב' : !unlocked ? ' — נעול' : ''}`}
            >
              <span
                className={`relative flex h-24 w-24 items-center justify-center rounded-full border-4 text-5xl shadow-xl ${
                  unlocked && ready ? `bg-gradient-to-br ${w.gradient} border-white` : 'border-gray-300 bg-gray-300 grayscale dark:border-gray-600 dark:bg-gray-700'
                }`}
              >
                {w.emoji}
                {(!unlocked || !ready) && <span className="absolute -bottom-1 -left-1 rounded-full bg-white px-1.5 text-xl shadow dark:bg-gray-800">{ready ? '🔒' : '🚧'}</span>}
                {beaten && <span className="absolute -right-1 -top-2 text-2xl">👑</span>}
              </span>
              <span className="mt-2 rounded-full bg-white/90 px-3 py-1 text-sm font-bold shadow dark:bg-indigo-950/90">{w.name}</span>
              <span className="text-xs text-violet-700 dark:text-violet-300">{!ready ? 'בקרוב' : unlocked ? `⭐ ${stars}/${w.levels.length * 3}` : w.topicTitle}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
