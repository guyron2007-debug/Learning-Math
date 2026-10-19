import { motion } from 'framer-motion';
import { useGame } from '../store/gameStore';
import { dateKey, goalProgress, nextLevel, nextReward } from '../store/logic';
import { LEVEL_TYPE_ICON, LEVEL_TYPE_LABEL, worldById } from '../content/worlds';
import { useUi } from '../store/ui';
import { Button, Card, ProgressBar } from '../components/ui';
import { dueMistakes } from './play/Review';
import { greeting } from './Splash';

export function Home() {
  const progress = useGame((s) => s.progress);
  const go = useUi((s) => s.go);
  const level = nextLevel(progress);
  const reward = nextReward(progress);
  const rewardProgress = reward && goalProgress(reward, progress);
  const waiting = progress.rewards.filter((r) => r.status === 'unlocked');
  const due = dueMistakes(progress.mistakes);
  const minutesToday = Math.floor((progress.practiceSeconds[dateKey()] ?? 0) / 60);
  const goal = progress.parent.dailyGoalMinutes;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">{greeting(progress.profile.name)} 👋</h1>

      {level && (
        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
          <button
            onClick={() => go({ name: 'play', levelId: level.id })}
            className={`relative w-full overflow-hidden rounded-3xl bg-gradient-to-br ${worldById(level.worldId).gradient} p-6 text-start text-white shadow-xl`}
          >
            <span className="absolute -left-4 -top-6 text-[9rem] leading-none opacity-20" aria-hidden>
              {worldById(level.worldId).emoji}
            </span>
            <span className="block text-sm font-medium opacity-90">
              {worldById(level.worldId).name} · {LEVEL_TYPE_ICON[level.type]} {LEVEL_TYPE_LABEL[level.type]}
            </span>
            <span className="mt-1 block text-3xl font-extrabold">המשך מסע ←</span>
            <span className="mt-1 block text-lg opacity-90">{level.title}</span>
          </button>
        </motion.div>
      )}

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-bold">🎁 הפרס הבא</h2>
          <button className="text-sm font-medium text-violet-600 dark:text-violet-300" onClick={() => go({ name: 'rewards' })}>
            כל הפרסים
          </button>
        </div>
        {reward && rewardProgress ? (
          <div className="flex items-center gap-4">
            <span className="text-5xl">{reward.icon}</span>
            <div className="flex-1">
              <p className="text-xl font-bold">{reward.title}</p>
              <ProgressBar value={rewardProgress.fraction} className="my-2 h-4" color="from-amber-300 to-orange-500" label="התקדמות לפרס" />
              <p className="text-sm text-violet-600 dark:text-violet-300">{rewardProgress.label}</p>
            </div>
          </div>
        ) : (
          <p className="text-violet-600 dark:text-violet-300">עדיין אין פרס פעיל. בקשי מההורים להגדיר פרס באזור ההורים 🔒</p>
        )}
        {waiting.length > 0 && (
          <p className="mt-3 rounded-2xl bg-emerald-50 p-3 font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
            🎉 {waiting.length === 1 ? `"${waiting[0].title}" מחכה למימוש!` : `${waiting.length} פרסים מחכים למימוש!`}
          </p>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="mb-2 text-lg font-bold">⏳ היעד היומי</h2>
          <ProgressBar value={minutesToday / goal} className="h-4" color="from-emerald-300 to-teal-500" label="יעד יומי" />
          <p className="mt-2 text-sm text-violet-600 dark:text-violet-300">
            {minutesToday >= goal ? `השלמת את היעד היומי! (${minutesToday} דק') ✅` : `${minutesToday} מתוך ${goal} דקות היום`}
          </p>
        </Card>
        <Card>
          <h2 className="mb-2 text-lg font-bold">🛠️ משימות תיקון</h2>
          {due.length ? (
            <>
              <p className="mb-3 text-sm text-violet-600 dark:text-violet-300">{due.length} שאלות שכדאי לנסות שוב</p>
              <Button variant="secondary" className="w-full" onClick={() => go({ name: 'review' })}>
                לתקן! 🔧
              </Button>
            </>
          ) : (
            <p className="text-sm text-violet-600 dark:text-violet-300">
              {progress.mistakes.length ? 'יש שאלות שיחזרו בהמשך לחזרה.' : 'אין כרגע מה לתקן ✨'}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
