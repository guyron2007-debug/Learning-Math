import type { Difficulty, TopicId } from '../engine/types';
import type { WorldId } from '../content/worlds';
import type { LearnerProfile } from '../tutor/types';

export type RewardGoal =
  | { type: 'xp'; amount: number }
  | { type: 'boss'; worldId: WorldId }
  | { type: 'streak'; days: number }
  | { type: 'stars3'; count: number }
  | { type: 'accuracy'; topic: TopicId; percent: number };

export type RewardStatus = 'active' | 'unlocked' | 'redeemed';

export interface Reward {
  id: string;
  title: string;
  icon: string;
  description: string;
  goal: RewardGoal;
  status: RewardStatus;
  createdAt: number;
  /** XP at creation time: XP goals count what was earned after the reward was set. */
  xpAtCreation: number;
  unlockedAt?: number;
  redeemedAt?: number;
}

export interface Mistake {
  id: string;
  generatorId: string;
  difficulty: Difficulty;
  dueAt: number;
}

export interface TopicStat {
  attempts: number;
  correct: number;
}

export interface Settings {
  musicVolume: number;
  sfxVolume: number;
  dark: boolean;
  textSize: 'sm' | 'md' | 'lg';
  /** The wizard twinkles after 60 seconds without input (spec B.4.1). */
  wizardNudge: boolean;
}

export interface ParentSettings {
  pin: string | null;
  worldOrder: WorldId[];
  manualUnlocks: WorldId[];
  dailyGoalMinutes: number;
}

export interface Progress {
  version: 1;
  profile: { name: string; avatar: string };
  xp: number;
  coins: number;
  levelStars: Record<string, number>;
  bossDefeated: Partial<Record<WorldId, { at: number; noHints: boolean }>>;
  topicStats: Partial<Record<TopicId, TopicStat>>;
  totals: { correct: number; answered: number; bestCombo: number; levelsCompleted: number; challengesSolved: number };
  /** Seconds practiced per local date key (YYYY-MM-DD). */
  practiceSeconds: Record<string, number>;
  rewards: Reward[];
  /** Rewards that unlocked and still need their treasure-chest moment. */
  pendingChests: string[];
  mistakes: Mistake[];
  cards: string[];
  achievements: Record<string, number>;
  parent: ParentSettings;
  settings: Settings;
  /** What the wizard knows about how she learns (spec B.3); included in the backup file. */
  learner: LearnerProfile;
}
