import { useGame } from '../store/gameStore';
import { ACHIEVEMENTS } from '../store/logic';
import { Card } from '../components/ui';

export function AchievementsScreen() {
  const earned = useGame((s) => s.progress.achievements);
  const totals = useGame((s) => s.progress.totals);
  return (
    <div>
      <h1 className="mb-4 text-2xl font-extrabold">🏅 הישגים</h1>
      <div className="mb-4 grid grid-cols-3 gap-3 text-center">
        <Card className="p-3">
          <p className="text-2xl font-extrabold">{totals.correct}</p>
          <p className="text-xs text-violet-500">תשובות נכונות</p>
        </Card>
        <Card className="p-3">
          <p className="text-2xl font-extrabold">{totals.bestCombo}</p>
          <p className="text-xs text-violet-500">הקומבו הכי גבוה</p>
        </Card>
        <Card className="p-3">
          <p className="text-2xl font-extrabold">{totals.levelsCompleted}</p>
          <p className="text-xs text-violet-500">שלבים הושלמו</p>
        </Card>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {ACHIEVEMENTS.map((a) => {
          const at = earned[a.id];
          return (
            <Card key={a.id} className={`flex items-center gap-4 ${at ? '' : 'opacity-50'}`}>
              <span className={`text-4xl ${at ? '' : 'grayscale'}`}>{a.icon}</span>
              <div>
                <p className="font-bold">{a.title}</p>
                <p className="text-sm text-violet-600 dark:text-violet-300">{a.description}</p>
                {at && <p className="text-xs text-emerald-600">הושג ב-{new Date(at).toLocaleDateString('he-IL')}</p>}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
