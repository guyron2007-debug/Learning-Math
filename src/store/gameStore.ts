import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Difficulty, TopicId } from '../engine/types';
import { DEFAULT_WORLD_ORDER, worldById, type LevelDef } from '../content/worlds';
import type { Progress, Reward, RewardGoal, Settings } from './types';
import { defaultLearner, recordOutcome, type Outcome } from '../tutor/profile';
import {
  coinsForStars,
  computeStars,
  dateKey,
  newlyEarnedAchievements,
  newlyUnlockedRewards,
  xpBonusForStars,
  xpForAnswer,
  type SessionResult,
} from './logic';

export const STORAGE_KEY = 'algebra-kadabra-progress';
const MISTAKE_DELAY_MS = 30 * 60 * 1000;
const MISTAKE_RETRY_MS = 24 * 60 * 60 * 1000;
const MAX_MISTAKES = 40;
/** A new reward may be cancelled shortly after creation (typo); after that it is binding. */
export const REWARD_CANCEL_WINDOW_MS = 10 * 60 * 1000;

export function defaultProgress(): Progress {
  return {
    version: 1,
    profile: { name: 'מיה', avatar: '🧙‍♀️' },
    xp: 0,
    coins: 0,
    levelStars: {},
    bossDefeated: {},
    topicStats: {},
    totals: { correct: 0, answered: 0, bestCombo: 0, levelsCompleted: 0, challengesSolved: 0 },
    practiceSeconds: {},
    rewards: [],
    pendingChests: [],
    mistakes: [],
    cards: [],
    achievements: {},
    parent: { pin: null, worldOrder: DEFAULT_WORLD_ORDER, manualUnlocks: [], dailyGoalMinutes: 15 },
    settings: { musicVolume: 0.3, sfxVolume: 0.8, dark: false, textSize: 'md', wizardNudge: true },
    learner: defaultLearner(),
  };
}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/** Moves rewards whose goals are met into "unlocked" and queues their chest animation. */
function applyRewardUnlocks(p: Progress): Progress {
  const ids = newlyUnlockedRewards(p);
  if (!ids.length) return p;
  const now = Date.now();
  return {
    ...p,
    rewards: p.rewards.map((r) => (ids.includes(r.id) ? { ...r, status: 'unlocked', unlockedAt: now } : r)),
    pendingChests: [...p.pendingChests, ...ids],
  };
}

export interface AnswerEvent {
  topic: TopicId;
  generatorId: string;
  difficulty: Difficulty;
  correct: boolean;
  combo: number;
  /** Review sessions reschedule mistakes themselves instead of logging new ones. */
  review?: boolean;
}

export interface LevelSummary {
  stars: number;
  previousStars: number;
  xpEarned: number;
  coinsEarned: number;
  newAchievements: string[];
  cardId?: string;
  firstBossWin: boolean;
}

export interface NewReward {
  title: string;
  icon: string;
  description: string;
  goal: RewardGoal;
}

interface GameState {
  progress: Progress;
  /** Returns the XP awarded. */
  recordAnswer: (e: AnswerEvent) => number;
  addPracticeSeconds: (seconds: number) => void;
  /** Updates the learner profile after a question or step (spec B.3). */
  recordLearning: (outcome: Outcome) => void;
  /** XP for solving after help: help never costs XP (spec B.1.5). */
  awardXp: (amount: number) => void;
  completeLevel: (level: LevelDef, result: SessionResult, sessionXp: number) => LevelSummary;
  resolveMistake: (id: string, correct: boolean) => void;
  addReward: (r: NewReward) => void;
  cancelReward: (id: string) => void;
  redeemReward: (id: string) => void;
  popChest: () => void;
  setProfile: (profile: Partial<Progress['profile']>) => void;
  setSettings: (settings: Partial<Settings>) => void;
  setParent: (parent: Partial<Progress['parent']>) => void;
  importProgress: (json: string) => void;
  resetProgress: () => void;
}

export const useGame = create<GameState>()(
  persist(
    (set, get) => {
      const update = (fn: (p: Progress) => Progress) => set((s) => ({ progress: fn(s.progress) }));

      return {
        progress: defaultProgress(),

        recordAnswer: (e) => {
          const xp = e.correct ? xpForAnswer(e.difficulty, e.combo) : 0;
          update((p) => {
            const stat = p.topicStats[e.topic] ?? { attempts: 0, correct: 0 };
            let mistakes = p.mistakes;
            if (!e.correct && !e.review) {
              mistakes = [
                ...mistakes.filter((m) => !(m.generatorId === e.generatorId && m.difficulty === e.difficulty)),
                { id: uid(), generatorId: e.generatorId, difficulty: e.difficulty, dueAt: Date.now() + MISTAKE_DELAY_MS },
              ].slice(-MAX_MISTAKES);
            }
            return applyRewardUnlocks({
              ...p,
              xp: p.xp + xp,
              coins: p.coins + (e.correct ? 1 : 0),
              topicStats: { ...p.topicStats, [e.topic]: { attempts: stat.attempts + 1, correct: stat.correct + (e.correct ? 1 : 0) } },
              totals: {
                ...p.totals,
                answered: p.totals.answered + 1,
                correct: p.totals.correct + (e.correct ? 1 : 0),
                bestCombo: Math.max(p.totals.bestCombo, e.combo),
              },
              mistakes,
            });
          });
          return xp;
        },

        addPracticeSeconds: (seconds) =>
          update((p) => {
            const key = dateKey();
            return applyRewardUnlocks({ ...p, practiceSeconds: { ...p.practiceSeconds, [key]: (p.practiceSeconds[key] ?? 0) + seconds } });
          }),

        recordLearning: (outcome) => update((p) => ({ ...p, learner: recordOutcome(p.learner, outcome) })),

        awardXp: (amount) => update((p) => applyRewardUnlocks({ ...p, xp: p.xp + amount })),

        completeLevel: (level, result, sessionXp) => {
          const p0 = get().progress;
          const stars = computeStars(result);
          const previousStars = p0.levelStars[level.id] ?? 0;
          const world = worldById(level.worldId);
          const isBoss = level.type === 'boss';
          const firstBossWin = isBoss && !p0.bossDefeated[world.id];
          const bonusXp = xpBonusForStars(stars) + (firstBossWin ? 100 : 0);
          const coinsEarned = coinsForStars(stars) + (firstBossWin ? 50 : 0);
          const cardId = firstBossWin && !p0.cards.includes(world.cardId) ? world.cardId : undefined;

          let p: Progress = {
            ...p0,
            xp: p0.xp + bonusXp,
            coins: p0.coins + coinsEarned,
            levelStars: { ...p0.levelStars, [level.id]: Math.max(previousStars, stars) },
            totals: { ...p0.totals, levelsCompleted: p0.totals.levelsCompleted + 1 },
            cards: cardId ? [...p0.cards, cardId] : p0.cards,
          };
          if (isBoss) {
            const noHints = result.hintsUsed === 0 || !!p0.bossDefeated[world.id]?.noHints;
            p = { ...p, bossDefeated: { ...p.bossDefeated, [world.id]: { at: p0.bossDefeated[world.id]?.at ?? Date.now(), noHints } } };
          }
          const newAchievements = newlyEarnedAchievements(p);
          const now = Date.now();
          p = { ...p, achievements: { ...p.achievements, ...Object.fromEntries(newAchievements.map((id) => [id, now])) } };
          set({ progress: applyRewardUnlocks(p) });

          return {
            stars,
            previousStars,
            xpEarned: sessionXp + bonusXp,
            coinsEarned: coinsEarned + result.correctFirstTry,
            newAchievements,
            cardId,
            firstBossWin,
          };
        },

        resolveMistake: (id, correct) =>
          update((p) => ({
            ...p,
            mistakes: correct
              ? p.mistakes.filter((m) => m.id !== id)
              : p.mistakes.map((m) => (m.id === id ? { ...m, dueAt: Date.now() + MISTAKE_RETRY_MS } : m)),
          })),

        addReward: (r) =>
          update((p) => {
            const reward: Reward = { ...r, id: uid(), status: 'active', createdAt: Date.now(), xpAtCreation: p.xp };
            return applyRewardUnlocks({ ...p, rewards: [...p.rewards, reward] });
          }),

        cancelReward: (id) =>
          update((p) => ({
            ...p,
            rewards: p.rewards.filter((r) => !(r.id === id && r.status === 'active' && Date.now() - r.createdAt < REWARD_CANCEL_WINDOW_MS)),
          })),

        redeemReward: (id) =>
          update((p) => ({
            ...p,
            rewards: p.rewards.map((r) => (r.id === id && r.status === 'unlocked' ? { ...r, status: 'redeemed', redeemedAt: Date.now() } : r)),
            pendingChests: p.pendingChests.filter((c) => c !== id),
          })),

        popChest: () => update((p) => ({ ...p, pendingChests: p.pendingChests.slice(1) })),

        setProfile: (profile) => update((p) => ({ ...p, profile: { ...p.profile, ...profile } })),
        setSettings: (settings) => update((p) => ({ ...p, settings: { ...p.settings, ...settings } })),
        setParent: (parent) => update((p) => ({ ...p, parent: { ...p.parent, ...parent } })),

        importProgress: (json) => {
          const data = JSON.parse(json) as Partial<Progress>;
          if (data?.version !== 1 || typeof data.xp !== 'number') throw new Error('קובץ התקדמות לא תקין');
          set({ progress: withDefaults(data) });
        },

        resetProgress: () => set((s) => ({ progress: { ...defaultProgress(), parent: s.progress.parent, settings: s.progress.settings } })),
      };
    },
    {
      name: STORAGE_KEY,
      version: 1,
      partialize: (s) => ({ progress: s.progress }),
      merge: (persisted, current) => {
        const saved = (persisted as { progress?: Partial<Progress> } | undefined)?.progress;
        return { ...current, progress: saved ? withDefaults(saved) : current.progress };
      },
    },
  ),
);

/** Fills fields added in newer versions so old saves keep working. */
function withDefaults(saved: Partial<Progress>): Progress {
  const d = defaultProgress();
  return {
    ...d,
    ...saved,
    profile: { ...d.profile, ...saved.profile },
    totals: { ...d.totals, ...saved.totals },
    parent: { ...d.parent, ...saved.parent },
    settings: { ...d.settings, ...saved.settings },
    learner: saved.learner?.schemaVersion === 1 ? { ...d.learner, ...saved.learner } : d.learner,
  };
}

export function exportProgress(): string {
  return JSON.stringify(useGame.getState().progress, null, 2);
}

