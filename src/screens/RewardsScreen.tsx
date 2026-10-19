import { useGame } from '../store/gameStore';
import { goalDescription, goalProgress } from '../store/logic';
import { Card, ProgressBar } from '../components/ui';
import type { Reward } from '../store/types';

function RewardCard({ reward }: { reward: Reward }) {
  const progress = useGame((s) => s.progress);
  const g = goalProgress(reward, progress);
  return (
    <Card className="flex items-center gap-4">
      <span className="text-5xl">{reward.icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xl font-bold">{reward.title}</p>
        {reward.description && <p className="text-sm text-violet-600 dark:text-violet-300">{reward.description}</p>}
        <p className="mt-1 text-sm">🎯 {goalDescription(reward.goal)}</p>
        <ProgressBar value={g.fraction} className="my-2 h-4" color="from-amber-300 to-orange-500" label="התקדמות לפרס" />
        <p className="text-sm font-medium text-violet-600 dark:text-violet-300">{g.label}</p>
      </div>
    </Card>
  );
}

export function RewardsScreen() {
  const rewards = useGame((s) => s.progress.rewards);
  const active = rewards.filter((r) => r.status === 'active');
  const unlocked = rewards.filter((r) => r.status === 'unlocked');
  const redeemed = rewards.filter((r) => r.status === 'redeemed').sort((a, b) => (b.redeemedAt ?? 0) - (a.redeemedAt ?? 0));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">🎁 הפרסים שלי</h1>

      {unlocked.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-bold">🎉 נפתחו — מחכים למימוש</h2>
          <div className="space-y-3">
            {unlocked.map((r) => (
              <Card key={r.id} className="flex items-center gap-4 ring-4 ring-amber-300">
                <span className="text-5xl">{r.icon}</span>
                <div>
                  <p className="text-xl font-bold">{r.title}</p>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300">הרווחת את זה! ההורים יסמנו כשהפרס ימומש.</p>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-lg font-bold">🏃‍♀️ בדרך</h2>
        {active.length ? (
          <div className="space-y-3">
            {active.map((r) => (
              <RewardCard key={r.id} reward={r} />
            ))}
          </div>
        ) : (
          <Card>
            <p className="text-violet-600 dark:text-violet-300">אין כרגע פרסים פעילים. ההורים יכולים להוסיף פרסים באזור ההורים (הגדרות ← אזור הורים).</p>
          </Card>
        )}
      </section>

      {redeemed.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-bold">✅ מומשו</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {redeemed.map((r) => (
              <Card key={r.id} className="text-center opacity-80">
                <p className="text-4xl">{r.icon}</p>
                <p className="font-bold">{r.title}</p>
                <p className="text-xs text-violet-500">{new Date(r.redeemedAt!).toLocaleDateString('he-IL')}</p>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
