import { useRef, useState } from 'react';
import { exportProgress, REWARD_CANCEL_WINDOW_MS, useGame, type NewReward } from '../store/gameStore';
import { dateKey, goalDescription, goalProgress, topicAccuracy, ACCURACY_MIN_ATTEMPTS } from '../store/logic';
import { WORLDS, worldById, type WorldId } from '../content/worlds';
import type { RewardGoal } from '../store/types';
import { useUi } from '../store/ui';
import { Button, Card, ProgressBar, ScreenHeader } from '../components/ui';

type Tab = 'rewards' | 'tracking' | 'plan' | 'general';

const inputClass = 'mt-1 w-full rounded-2xl border-2 border-violet-200 bg-white px-4 py-3 text-lg dark:border-violet-800 dark:bg-violet-950';

function PinGate({ onOpen }: { onOpen: () => void }) {
  const pin = useGame((s) => s.progress.parent.pin);
  const setParent = useGame((s) => s.setParent);
  const [value, setValue] = useState('');
  const [confirm, setConfirm] = useState<string | null>(null);
  const [error, setError] = useState('');
  const creating = pin === null;

  const submit = () => {
    if (!/^\d{4}$/.test(value)) return setError('קוד של 4 ספרות');
    if (!creating) {
      if (value === pin) onOpen();
      else {
        setError('קוד שגוי');
        setValue('');
      }
      return;
    }
    if (confirm === null) {
      setConfirm(value);
      setValue('');
      setError('');
    } else if (confirm === value) {
      setParent({ pin: value });
      onOpen();
    } else {
      setError('הקודים לא תואמים, נסו שוב');
      setConfirm(null);
      setValue('');
    }
  };

  return (
    <Card className="mx-auto max-w-sm text-center">
      <p className="text-5xl">🔒</p>
      <h2 className="mt-2 text-xl font-bold">{creating ? (confirm === null ? 'בחרו קוד הורים (4 ספרות)' : 'הקלידו שוב לאישור') : 'הקלידו קוד הורים'}</h2>
      <input
        type="password"
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        value={value}
        autoFocus
        onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        className={`${inputClass} text-center text-3xl tracking-[0.5em]`}
        dir="ltr"
        aria-label="קוד הורים"
      />
      {error && <p className="mt-2 text-rose-600">{error}</p>}
      <Button className="mt-4 w-full" onClick={submit}>
        {creating && confirm === null ? 'המשך' : 'כניסה'}
      </Button>
    </Card>
  );
}

const ICONS = ['🍦', '📚', '🎬', '🍕', '🎮', '🎨', '🛍️', '🎢', '🧁', '🏊‍♀️', '🎧', '💸', '🎁', '🌟'];
const GOAL_TYPES: Array<{ type: RewardGoal['type']; label: string }> = [
  { type: 'xp', label: 'כמות XP מצטברת' },
  { type: 'boss', label: 'ניצחון בבוס של עולם' },
  { type: 'streak', label: 'רצף ימי אימון' },
  { type: 'stars3', label: 'שלבים עם 3 כוכבים' },
  { type: 'accuracy', label: 'דיוק בנושא' },
];

function RewardForm() {
  const addReward = useGame((s) => s.addReward);
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState(ICONS[0]);
  const [description, setDescription] = useState('');
  const [type, setType] = useState<RewardGoal['type']>('xp');
  const [amount, setAmount] = useState(500);
  const [world, setWorld] = useState<WorldId>('equations');
  const [done, setDone] = useState(false);

  const goal = (): RewardGoal => {
    switch (type) {
      case 'xp': return { type, amount };
      case 'boss': return { type, worldId: world };
      case 'streak': return { type, days: amount };
      case 'stars3': return { type, count: amount };
      case 'accuracy': return { type, topic: world, percent: Math.min(100, amount) };
    }
  };

  const defaults: Record<RewardGoal['type'], number> = { xp: 500, boss: 0, streak: 5, stars3: 5, accuracy: 85 };
  const amountLabel: Record<RewardGoal['type'], string> = { xp: 'כמה XP?', boss: '', streak: 'כמה ימים ברצף?', stars3: 'כמה שלבים?', accuracy: 'אחוז דיוק נדרש' };

  const submit = () => {
    if (!title.trim() || (type !== 'boss' && amount <= 0)) return;
    const r: NewReward = { title: title.trim(), icon, description: description.trim(), goal: goal() };
    addReward(r);
    setTitle('');
    setDescription('');
    setDone(true);
    setTimeout(() => setDone(false), 2500);
  };

  return (
    <Card className="space-y-3">
      <h3 className="text-lg font-bold">➕ פרס חדש</h3>
      <label className="block">
        <span className="font-medium">שם הפרס</span>
        <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="למשל: יציאה לגלידה" maxLength={40} />
      </label>
      <div>
        <span className="font-medium">אייקון</span>
        <div className="mt-1 flex flex-wrap gap-2">
          {ICONS.map((i) => (
            <button key={i} onClick={() => setIcon(i)} className={`h-12 w-12 rounded-xl text-2xl ${icon === i ? 'bg-violet-200 ring-2 ring-violet-500 dark:bg-violet-800' : 'bg-violet-50 dark:bg-violet-950'}`} aria-pressed={icon === i}>
              {i}
            </button>
          ))}
        </div>
      </div>
      <label className="block">
        <span className="font-medium">תיאור (לא חובה)</span>
        <input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={80} />
      </label>
      <label className="block">
        <span className="font-medium">סוג היעד</span>
        <select
          className={inputClass}
          value={type}
          onChange={(e) => {
            const t = e.target.value as RewardGoal['type'];
            setType(t);
            setAmount(defaults[t]);
          }}
        >
          {GOAL_TYPES.map((g) => (
            <option key={g.type} value={g.type}>
              {g.label}
            </option>
          ))}
        </select>
      </label>
      {(type === 'boss' || type === 'accuracy') && (
        <label className="block">
          <span className="font-medium">{type === 'boss' ? 'איזה עולם?' : 'באיזה נושא?'}</span>
          <select className={inputClass} value={world} onChange={(e) => setWorld(e.target.value as WorldId)}>
            {WORLDS.map((w) => (
              <option key={w.id} value={w.id}>
                {w.emoji} {type === 'boss' ? w.name : w.topicTitle}
                {w.levels.length ? '' : ' (בקרוב)'}
              </option>
            ))}
          </select>
        </label>
      )}
      {type !== 'boss' && (
        <label className="block">
          <span className="font-medium">{amountLabel[type]}</span>
          <input className={inputClass} type="number" min={1} value={amount} onChange={(e) => setAmount(Math.max(0, Math.floor(Number(e.target.value))))} dir="ltr" />
          {type === 'accuracy' && <span className="text-xs text-violet-500">נספר רק אחרי {ACCURACY_MIN_ATTEMPTS} שאלות לפחות בנושא.</span>}
          {type === 'xp' && <span className="text-xs text-violet-500">נספר XP שנצבר מרגע הגדרת הפרס. שלב טיפוסי מניב כ-150–250 XP.</span>}
        </label>
      )}
      <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
        ⚖️ כדי שהיעדים ירגישו אמינים, אי אפשר לשנות יעד אחרי שנקבע. אפשר לבטל פרס רק בעשר הדקות הראשונות (למקרה של טעות).
      </p>
      <Button className="w-full" onClick={submit} disabled={!title.trim()}>
        {done ? 'נוסף! ✓' : 'הוספת פרס'}
      </Button>
    </Card>
  );
}

function RewardsTab() {
  const progress = useGame((s) => s.progress);
  const redeem = useGame((s) => s.redeemReward);
  const cancel = useGame((s) => s.cancelReward);
  const active = progress.rewards.filter((r) => r.status === 'active');
  const unlocked = progress.rewards.filter((r) => r.status === 'unlocked');
  const redeemed = progress.rewards.filter((r) => r.status === 'redeemed');

  return (
    <div className="space-y-4">
      {unlocked.length > 0 && (
        <Card>
          <h3 className="mb-2 text-lg font-bold">🎉 ממתינים למימוש</h3>
          <ul className="space-y-2">
            {unlocked.map((r) => (
              <li key={r.id} className="flex items-center gap-3">
                <span className="text-3xl">{r.icon}</span>
                <span className="flex-1">
                  <b>{r.title}</b>
                  <br />
                  <span className="text-xs text-violet-500">נפתח ב-{new Date(r.unlockedAt!).toLocaleDateString('he-IL')}</span>
                </span>
                <Button variant="success" className="min-h-10 px-3 py-2 text-base" onClick={() => redeem(r.id)}>
                  מומש ✓
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h3 className="mb-2 text-lg font-bold">🏃‍♀️ פרסים פעילים</h3>
        {active.length ? (
          <ul className="space-y-3">
            {active.map((r) => {
              const g = goalProgress(r, progress);
              const cancellable = Date.now() - r.createdAt < REWARD_CANCEL_WINDOW_MS;
              return (
                <li key={r.id} className="flex items-center gap-3">
                  <span className="text-3xl">{r.icon}</span>
                  <div className="flex-1">
                    <b>{r.title}</b> <span className="text-sm text-violet-500">— {goalDescription(r.goal)}</span>
                    <ProgressBar value={g.fraction} className="my-1" color="from-amber-300 to-orange-500" />
                    <span className="text-xs text-violet-500">{g.label}</span>
                  </div>
                  {cancellable && (
                    <Button variant="ghost" className="min-h-10 px-3 py-2 text-sm" onClick={() => cancel(r.id)}>
                      ביטול
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-violet-500">אין פרסים פעילים. הוסיפו פרס כדי שתמיד יהיה ברור למה מתאמנים היום.</p>
        )}
      </Card>

      <RewardForm />

      {redeemed.length > 0 && (
        <Card>
          <h3 className="mb-2 text-lg font-bold">🗄️ ארכיון</h3>
          <ul className="space-y-1 text-sm">
            {redeemed.map((r) => (
              <li key={r.id}>
                {r.icon} {r.title} — נפתח {new Date(r.unlockedAt!).toLocaleDateString('he-IL')}, מומש {new Date(r.redeemedAt!).toLocaleDateString('he-IL')}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function TrackingTab() {
  const progress = useGame((s) => s.progress);
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return { date: d, minutes: Math.round((progress.practiceSeconds[dateKey(d)] ?? 0) / 60) };
  });
  const maxMinutes = Math.max(progress.parent.dailyGoalMinutes, ...days.map((d) => d.minutes));
  const topics = WORLDS.filter((w) => (progress.topicStats[w.id]?.attempts ?? 0) > 0);
  const weak = topics.filter((w) => (progress.topicStats[w.id]?.attempts ?? 0) >= 10 && topicAccuracy(progress, w.id) < 70);

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="mb-3 text-lg font-bold">⏱️ דקות אימון — 14 הימים האחרונים</h3>
        <div className="flex h-40 items-end gap-1" dir="ltr">
          {days.map((d) => (
            <div key={d.date.toISOString()} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] text-violet-500">{d.minutes || ''}</span>
              <div
                className={`w-full rounded-t-md ${d.minutes >= progress.parent.dailyGoalMinutes ? 'bg-emerald-400' : 'bg-violet-300 dark:bg-violet-700'}`}
                style={{ height: `${(d.minutes / maxMinutes) * 100}%`, minHeight: d.minutes ? 4 : 1 }}
                title={`${d.date.toLocaleDateString('he-IL')}: ${d.minutes} דק'`}
              />
              <span className="text-[10px] text-violet-500">{d.date.getDate()}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-violet-500">ירוק = עמידה ביעד היומי ({progress.parent.dailyGoalMinutes} דק')</p>
      </Card>

      <Card>
        <h3 className="mb-3 text-lg font-bold">🎯 דיוק לפי נושא</h3>
        {topics.length ? (
          <ul className="space-y-3">
            {topics.map((w) => {
              const s = progress.topicStats[w.id]!;
              const acc = topicAccuracy(progress, w.id);
              return (
                <li key={w.id}>
                  <div className="flex justify-between text-sm">
                    <span>
                      {w.emoji} {w.topicTitle}
                    </span>
                    <span>
                      {acc}% ({s.correct}/{s.attempts})
                    </span>
                  </div>
                  <ProgressBar value={acc / 100} color={acc >= 80 ? 'from-emerald-300 to-emerald-500' : acc >= 65 ? 'from-amber-300 to-amber-500' : 'from-rose-300 to-rose-500'} />
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-violet-500">עדיין אין נתונים.</p>
        )}
        {weak.length > 0 && <p className="mt-3 rounded-2xl bg-rose-50 p-3 text-sm dark:bg-rose-950/40">נושאים שכדאי לחזק: {weak.map((w) => w.topicTitle).join(', ')}</p>}
      </Card>

      <Card>
        <h3 className="mb-2 text-lg font-bold">📊 סיכום</h3>
        <ul className="grid grid-cols-2 gap-2 text-sm">
          <li>XP: <b>{progress.xp}</b></li>
          <li>שלבים שהושלמו: <b>{progress.totals.levelsCompleted}</b></li>
          <li>תשובות: <b>{progress.totals.answered}</b></li>
          <li>נכונות: <b>{progress.totals.correct}</b></li>
          <li>בוסים: <b>{Object.keys(progress.bossDefeated).length}</b></li>
          <li>פרסים שנפתחו: <b>{progress.rewards.filter((r) => r.status !== 'active').length}</b></li>
        </ul>
      </Card>
    </div>
  );
}

function PlanTab() {
  const parent = useGame((s) => s.progress.parent);
  const setParent = useGame((s) => s.setParent);
  const order = [...parent.worldOrder, ...WORLDS.map((w) => w.id).filter((id) => !parent.worldOrder.includes(id))];

  const move = (i: number, dir: -1 | 1) => {
    const next = [...order];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    setParent({ worldOrder: next });
  };
  const toggle = (id: WorldId) =>
    setParent({ manualUnlocks: parent.manualUnlocks.includes(id) ? parent.manualUnlocks.filter((x) => x !== id) : [...parent.manualUnlocks, id] });

  return (
    <Card>
      <h3 className="mb-1 text-lg font-bold">🗺️ סדר העולמות</h3>
      <p className="mb-3 text-sm text-violet-500">העולם הבא נפתח אחרי ניצחון בבוס של העולם הקודם. אפשר גם לפתוח עולם ידנית כדי להתאים למה שלומדים בכיתה.</p>
      <ol className="space-y-2">
        {order.map((id, i) => {
          const w = worldById(id);
          return (
            <li key={id} className="flex items-center gap-2 rounded-2xl bg-violet-50 p-2 dark:bg-violet-950">
              <span className="w-6 text-center font-bold text-violet-500">{i + 1}</span>
              <span className="text-2xl">{w.emoji}</span>
              <span className="flex-1">
                {w.name}
                {!w.levels.length && <span className="text-xs text-violet-400"> (בקרוב)</span>}
              </span>
              <label className="flex items-center gap-1 text-xs">
                <input type="checkbox" checked={parent.manualUnlocks.includes(id)} onChange={() => toggle(id)} className="h-5 w-5 accent-violet-600" />
                פתוח
              </label>
              <button className="h-9 w-9 rounded-xl bg-white disabled:opacity-30 dark:bg-violet-900" disabled={i === 0} onClick={() => move(i, -1)} aria-label="הזזה למעלה">
                ▲
              </button>
              <button className="h-9 w-9 rounded-xl bg-white disabled:opacity-30 dark:bg-violet-900" disabled={i === order.length - 1} onClick={() => move(i, 1)} aria-label="הזזה למטה">
                ▼
              </button>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function GeneralTab() {
  const parent = useGame((s) => s.progress.parent);
  const setParent = useGame((s) => s.setParent);
  const importProgress = useGame((s) => s.importProgress);
  const resetProgress = useGame((s) => s.resetProgress);
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [newPin, setNewPin] = useState('');

  const download = () => {
    const blob = new Blob([exportProgress()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `algebra-kadabra-${dateKey()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const upload = async (file: File) => {
    try {
      importProgress(await file.text());
      setMessage('ההתקדמות שוחזרה ✓');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'שגיאה בקריאת הקובץ');
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="mb-2 text-lg font-bold">⏳ יעד יומי</h3>
        <div className="flex items-center gap-3">
          <input type="range" min={5} max={60} step={5} value={parent.dailyGoalMinutes} onChange={(e) => setParent({ dailyGoalMinutes: Number(e.target.value) })} className="flex-1 accent-violet-600" />
          <span className="w-20 font-bold">{parent.dailyGoalMinutes} דק'</span>
        </div>
      </Card>

      <Card className="space-y-3">
        <h3 className="text-lg font-bold">💾 גיבוי</h3>
        <p className="text-sm text-violet-500">ההתקדמות נשמרת במכשיר הזה בלבד. מומלץ לשמור גיבוי מדי פעם.</p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={download}>
            ייצוא לקובץ
          </Button>
          <Button variant="secondary" className="flex-1" onClick={() => fileRef.current?.click()}>
            ייבוא מקובץ
          </Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </div>
        {message && <p className="text-sm font-medium">{message}</p>}
      </Card>

      <Card className="space-y-3">
        <h3 className="text-lg font-bold">🔑 שינוי קוד הורים</h3>
        <div className="flex gap-3">
          <input type="password" inputMode="numeric" maxLength={4} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))} className={`${inputClass} mt-0 flex-1 text-center tracking-[0.4em]`} dir="ltr" aria-label="קוד חדש" />
          <Button
            variant="secondary"
            disabled={newPin.length !== 4}
            onClick={() => {
              setParent({ pin: newPin });
              setNewPin('');
              setMessage('הקוד עודכן ✓');
            }}
          >
            שמירה
          </Button>
        </div>
      </Card>

      <Card>
        <h3 className="mb-2 text-lg font-bold text-rose-600">⚠️ איפוס התקדמות</h3>
        <p className="mb-3 text-sm text-violet-500">מוחק XP, כוכבים, פרסים והישגים. ההגדרות וקוד ההורים נשמרים.</p>
        <Button
          variant="danger"
          onClick={() => {
            if (window.confirm('למחוק את כל ההתקדמות? אי אפשר לבטל את זה.')) resetProgress();
          }}
        >
          איפוס
        </Button>
      </Card>
    </div>
  );
}

export function ParentScreen() {
  const go = useUi((s) => s.go);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('rewards');
  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'rewards', label: '🎁 פרסים' },
    { id: 'tracking', label: '📈 מעקב' },
    { id: 'plan', label: '🗺️ תוכנית' },
    { id: 'general', label: '⚙️ כללי' },
  ];

  return (
    <div>
      <ScreenHeader title="אזור הורים" onBack={() => go({ name: 'settings' })} />
      {!open ? (
        <PinGate onOpen={() => setOpen(true)} />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-4 gap-1 rounded-2xl bg-violet-100 p-1 dark:bg-violet-950">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`rounded-xl py-2 text-sm font-bold transition ${tab === t.id ? 'bg-white shadow dark:bg-violet-800' : 'text-violet-600 dark:text-violet-300'}`}>
                {t.label}
              </button>
            ))}
          </div>
          {tab === 'rewards' && <RewardsTab />}
          {tab === 'tracking' && <TrackingTab />}
          {tab === 'plan' && <PlanTab />}
          {tab === 'general' && <GeneralTab />}
        </>
      )}
    </div>
  );
}
