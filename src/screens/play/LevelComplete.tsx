import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { LevelDef } from '../../content/worlds';
import { cardById } from '../../content/cards';
import type { LevelSummary } from '../../store/gameStore';
import { ACHIEVEMENTS, playerLevel } from '../../store/logic';
import { Button, Card } from '../../components/ui';
import { Burst } from '../../components/Particles';
import { RichText } from '../../components/Math';
import { play } from '../../audio/sound';

interface Props {
  level: LevelDef;
  summary: LevelSummary;
  xpBefore: number;
  xpAfter: number;
  nextLevel?: LevelDef;
  onNext: () => void;
  onRetry: () => void;
  onMap: () => void;
}

export function LevelComplete({ level, summary, xpBefore, xpAfter, nextLevel, onNext, onRetry, onMap }: Props) {
  const [shownStars, setShownStars] = useState(0);
  const before = playerLevel(xpBefore);
  const after = playerLevel(xpAfter);
  const leveledUp = after.level > before.level;
  const card = summary.cardId ? cardById(summary.cardId) : undefined;

  useEffect(() => {
    const timers = Array.from({ length: summary.stars }, (_, i) =>
      setTimeout(() => {
        setShownStars(i + 1);
        play('star');
      }, 500 + i * 550),
    );
    const extra = setTimeout(() => play(leveledUp ? 'levelUp' : 'coin'), 600 + summary.stars * 550);
    return () => [...timers, extra].forEach(clearTimeout);
  }, [summary.stars, leveledUp]);

  return (
    <div className="space-y-4">
      <Card className="relative overflow-visible text-center">
        <p className="text-violet-500">{level.title}</p>
        <h2 className="text-3xl font-extrabold">{summary.stars === 3 ? 'מושלם!' : summary.stars === 2 ? 'כל הכבוד!' : 'סיימת את השלב!'}</h2>
        <div className="relative my-6 flex justify-center gap-3 text-6xl" aria-label={`${summary.stars} כוכבים`}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="relative h-16 w-16">
              <span className="absolute inset-0 opacity-20 grayscale">⭐</span>
              {i < shownStars && (
                <motion.span className="absolute inset-0" initial={{ y: -120, scale: 2, rotate: -90, opacity: 0 }} animate={{ y: 0, scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }}>
                  ⭐
                  <Burst count={10} spread={70} />
                </motion.span>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-3 text-xl font-bold">
          <span className="rounded-full bg-violet-100 px-4 py-2 dark:bg-violet-900" dir="ltr">+{summary.xpEarned} XP</span>
          <span className="rounded-full bg-amber-100 px-4 py-2 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200" dir="ltr">+{summary.coinsEarned} 🪙</span>
        </div>
        {summary.stars < 3 && <p className="mt-4 text-sm text-violet-500">לשלושה כוכבים: דיוק של 90% ומעלה{level.timeLimit ? ', בתוך זמן הבונוס' : ''}, ומעט רמזים.</p>}
        {summary.stars > summary.previousStars && summary.previousStars > 0 && <p className="mt-2 font-bold text-emerald-600">שיא חדש בשלב הזה! 📈</p>}
      </Card>

      {leveledUp && (
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 2 }}>
          <Card className="bg-gradient-to-l from-fuchsia-100 to-violet-100 text-center dark:from-fuchsia-950 dark:to-violet-950">
            <p className="text-4xl">🎉</p>
            <p className="text-2xl font-extrabold">עלית לרמה {after.level}!</p>
            <p className="text-violet-600 dark:text-violet-300">התואר שלך: {after.title}</p>
          </Card>
        </motion.div>
      )}

      {card && (
        <Card className="text-center">
          <p className="font-bold text-violet-500">קלף חדש לאוסף!</p>
          <p className="my-2 text-6xl">{card.emoji}</p>
          <p className="text-xl font-extrabold">{card.name}</p>
          <p className="mt-2 text-sm">
            <RichText text={card.fact} />
          </p>
        </Card>
      )}

      {summary.newAchievements.length > 0 && (
        <Card>
          <p className="mb-2 font-bold">הישגים חדשים 🏅</p>
          <ul className="space-y-2">
            {summary.newAchievements.map((id) => {
              const a = ACHIEVEMENTS.find((x) => x.id === id)!;
              return (
                <li key={id} className="flex items-center gap-3">
                  <span className="text-3xl">{a.icon}</span>
                  <span>
                    <b>{a.title}</b> — {a.description}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        {nextLevel && (
          <Button className="flex-1" onClick={onNext}>
            לשלב הבא ←
          </Button>
        )}
        <Button variant="secondary" className="flex-1" onClick={onRetry}>
          שוב 🔁
        </Button>
        <Button variant="secondary" className="flex-1" onClick={onMap}>
          למפה 🗺️
        </Button>
      </div>
    </div>
  );
}
