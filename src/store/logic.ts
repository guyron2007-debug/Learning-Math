import type { Progress, Reward, RewardGoal } from './types';
import { WORLDS, worldById, type LevelDef, type WorldDef, type WorldId } from '../content/worlds';

// ---------- Dates ----------

export function dateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

/** Consecutive practice days ending today (or yesterday, if today isn't done yet). */
export function currentStreak(practiceSeconds: Record<string, number>, now = new Date()): number {
  const practiced = (d: Date) => (practiceSeconds[dateKey(d)] ?? 0) > 0;
  let day = practiced(now) ? now : addDays(now, -1);
  let streak = 0;
  while (practiced(day)) {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}

// ---------- Player level ----------

const TITLES = ['חניכה', 'חניכה', 'חוקרת', 'חוקרת', 'מכשפת משוואות', 'מכשפת משוואות', 'קוסמת הגורמים', 'קוסמת הגורמים', 'אדונית הפרבולות', 'אדונית הפרבולות', 'ארכי-מכשפת המתמטיקה'];

/** XP needed to reach `level` (level 1 = 0). Each level costs 50 XP more than the previous one. */
export function xpForLevel(level: number): number {
  const n = level - 1;
  return 100 * n + 25 * n * (n - 1);
}

export function playerLevel(xp: number) {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  const floor = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return {
    level,
    title: TITLES[Math.min(level - 1, TITLES.length - 1)],
    intoLevel: xp - floor,
    levelSize: next - floor,
    fraction: (xp - floor) / (next - floor),
  };
}

// ---------- Scoring ----------

export function xpForAnswer(difficulty: number, combo: number): number {
  return 10 + 2 * difficulty + Math.min(10, 2 * Math.max(0, combo - 1));
}

export interface SessionResult {
  correctFirstTry: number;
  total: number;
  hintsUsed: number;
  seconds: number;
  timeLimit?: number;
  maxCombo: number;
}

export function computeStars(r: SessionResult): 1 | 2 | 3 {
  const accuracy = r.total ? r.correctFirstTry / r.total : 0;
  const score = accuracy - Math.min(0.3, r.hintsUsed * 0.05);
  const inTime = r.timeLimit === undefined || r.seconds <= r.timeLimit;
  if (score >= 0.9 && inTime) return 3;
  if (score >= 0.7) return 2;
  return 1;
}

export const coinsForStars = (stars: number) => [0, 5, 10, 20][stars];
export const xpBonusForStars = (stars: number) => [0, 10, 25, 50][stars];

// ---------- Worlds and levels ----------

export const worldHasContent = (w: WorldDef) => w.levels.length > 0;

export function orderedWorlds(p: Progress): WorldDef[] {
  const known = p.parent.worldOrder.filter((id) => WORLDS.some((w) => w.id === id));
  const missing = WORLDS.filter((w) => !known.includes(w.id)).map((w) => w.id);
  return [...known, ...missing].map(worldById);
}

/**
 * A world is open if the parent unlocked it, or it is the first playable world in the
 * study order, or the boss of the previous playable world was defeated.
 * Worlds without content yet are skipped in the chain.
 */
export function isWorldUnlocked(p: Progress, id: WorldId): boolean {
  if (p.parent.manualUnlocks.includes(id)) return true;
  const playable = orderedWorlds(p).filter(worldHasContent);
  const i = playable.findIndex((w) => w.id === id);
  if (i < 0) return false;
  if (i === 0) return true;
  return !!p.bossDefeated[playable[i - 1].id];
}

export function isLevelUnlocked(p: Progress, level: LevelDef): boolean {
  const world = worldById(level.worldId);
  if (!isWorldUnlocked(p, world.id)) return false;
  const i = world.levels.findIndex((l) => l.id === level.id);
  return i === 0 || (p.levelStars[world.levels[i - 1].id] ?? 0) > 0;
}

/** The level "המשך מסע" jumps to: first unplayed open level, else the weakest one. */
export function nextLevel(p: Progress): LevelDef | undefined {
  const open = orderedWorlds(p)
    .filter((w) => isWorldUnlocked(p, w.id))
    .flatMap((w) => w.levels)
    .filter((l) => isLevelUnlocked(p, l));
  return (
    open.find((l) => !p.levelStars[l.id]) ??
    [...open].sort((a, b) => (p.levelStars[a.id] ?? 0) - (p.levelStars[b.id] ?? 0))[0]
  );
}

export const threeStarCount = (p: Progress) => Object.values(p.levelStars).filter((s) => s >= 3).length;

export function topicAccuracy(p: Progress, topic: keyof Progress['topicStats']) {
  const s = p.topicStats[topic];
  return s && s.attempts ? Math.round((100 * s.correct) / s.attempts) : 0;
}

// ---------- Rewards ----------

/** Minimum answered questions before an accuracy goal can count. */
export const ACCURACY_MIN_ATTEMPTS = 30;

export interface GoalProgress {
  current: number;
  target: number;
  fraction: number;
  done: boolean;
  label: string;
}

export function goalDescription(goal: RewardGoal): string {
  switch (goal.type) {
    case 'xp': return `לצבור ${goal.amount} XP`;
    case 'boss': return `לנצח את הבוס של ${worldById(goal.worldId).name}`;
    case 'streak': return `רצף של ${goal.days} ימי אימון`;
    case 'stars3': return `${goal.count} שלבים עם 3 כוכבים`;
    case 'accuracy': return `דיוק של ${goal.percent}% ב${worldById(goal.topic).topicTitle}`;
  }
}

export function goalProgress(reward: Reward, p: Progress): GoalProgress {
  const g = reward.goal;
  const make = (current: number, target: number, label: string): GoalProgress => ({
    current,
    target,
    fraction: target ? Math.min(1, Math.max(0, current / target)) : 0,
    done: current >= target,
    label,
  });
  switch (g.type) {
    case 'xp': {
      const earned = p.xp - reward.xpAtCreation;
      return make(earned, g.amount, `עוד ${Math.max(0, g.amount - earned)} XP`);
    }
    case 'boss': {
      const done = p.bossDefeated[g.worldId] ? 1 : 0;
      return make(done, 1, `נצחי את הבוס של ${worldById(g.worldId).name}`);
    }
    case 'streak': {
      const s = currentStreak(p.practiceSeconds);
      return make(s, g.days, `עוד ${Math.max(0, g.days - s)} ימי רצף`);
    }
    case 'stars3': {
      const c = threeStarCount(p);
      return make(c, g.count, `עוד ${Math.max(0, g.count - c)} שלבים עם 3 כוכבים`);
    }
    case 'accuracy': {
      const attempts = p.topicStats[g.topic]?.attempts ?? 0;
      const acc = topicAccuracy(p, g.topic);
      if (attempts < ACCURACY_MIN_ATTEMPTS) {
        return { ...make(attempts, ACCURACY_MIN_ATTEMPTS, `עוד ${ACCURACY_MIN_ATTEMPTS - attempts} שאלות עד שהדיוק נספר`), done: false };
      }
      return make(acc, g.percent, `דיוק נוכחי ${acc}% מתוך ${g.percent}%`);
    }
  }
}

/** Ids of active rewards whose goal is now reached. */
export function newlyUnlockedRewards(p: Progress): string[] {
  return p.rewards.filter((r) => r.status === 'active' && goalProgress(r, p).done).map((r) => r.id);
}

/** The active reward closest to completion, shown on the home screen. */
export function nextReward(p: Progress): Reward | undefined {
  return p.rewards
    .filter((r) => r.status === 'active')
    .sort((a, b) => goalProgress(b, p).fraction - goalProgress(a, p).fraction)[0];
}

// ---------- Achievements ----------

export interface AchievementDef {
  id: string;
  title: string;
  icon: string;
  description: string;
  earned: (p: Progress) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-level', title: 'צעד ראשון', icon: '👣', description: 'סיימי שלב ראשון', earned: (p) => p.totals.levelsCompleted >= 1 },
  { id: 'combo-10', title: 'על גלגלים', icon: '🔥', description: '10 תשובות נכונות ברצף', earned: (p) => p.totals.bestCombo >= 10 },
  { id: 'correct-100', title: 'מאה!', icon: '💯', description: '100 תשובות נכונות', earned: (p) => p.totals.correct >= 100 },
  { id: 'correct-500', title: 'מכונת פתרונות', icon: '⚙️', description: '500 תשובות נכונות', earned: (p) => p.totals.correct >= 500 },
  { id: 'stars-5', title: 'אספנית כוכבים', icon: '🌟', description: '5 שלבים עם 3 כוכבים', earned: (p) => threeStarCount(p) >= 5 },
  { id: 'boss-1', title: 'קוטלת בוסים', icon: '⚔️', description: 'נצחי בוס ראשון', earned: (p) => Object.keys(p.bossDefeated).length >= 1 },
  { id: 'boss-no-hints', title: 'בלי רשת ביטחון', icon: '🎯', description: 'נצחי בוס בלי להשתמש ברמזים', earned: (p) => Object.values(p.bossDefeated).some((b) => b?.noHints) },
  { id: 'streak-3', title: 'להבה קטנה', icon: '🕯️', description: 'רצף של 3 ימים', earned: (p) => currentStreak(p.practiceSeconds) >= 3 },
  { id: 'streak-7', title: 'שבוע בוער', icon: '🔥', description: 'רצף של 7 ימים', earned: (p) => currentStreak(p.practiceSeconds) >= 7 },
  { id: 'world-equations', title: 'מלכת המפרץ', icon: '🌊', description: '3 כוכבים בכל שלבי מפרץ המשוואות', earned: (p) => worldById('equations').levels.every((l) => (p.levelStars[l.id] ?? 0) >= 3) },
];

export function newlyEarnedAchievements(p: Progress): string[] {
  return ACHIEVEMENTS.filter((a) => !p.achievements[a.id] && a.earned(p)).map((a) => a.id);
}
