import { describe, expect, it } from 'vitest';
import { defaultProgress } from './gameStore';
import { computeStars, currentStreak, dateKey, goalProgress, isLevelUnlocked, isWorldUnlocked, nextLevel, playerLevel, xpForLevel } from './logic';
import { levelById } from '../content/worlds';
import type { Reward } from './types';

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dateKey(d);
};

describe('streak', () => {
  it('counts consecutive days ending today or yesterday', () => {
    expect(currentStreak({})).toBe(0);
    expect(currentStreak({ [daysAgo(0)]: 60, [daysAgo(1)]: 60, [daysAgo(3)]: 60 })).toBe(2);
    expect(currentStreak({ [daysAgo(1)]: 60, [daysAgo(2)]: 60 })).toBe(2);
    expect(currentStreak({ [daysAgo(2)]: 60 })).toBe(0);
  });
});

describe('player level', () => {
  it('uses growing thresholds', () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(100);
    expect(xpForLevel(3)).toBe(250);
    expect(playerLevel(0).level).toBe(1);
    expect(playerLevel(249).level).toBe(2);
    expect(playerLevel(250).level).toBe(3);
  });
});

describe('stars', () => {
  const base = { total: 10, hintsUsed: 0, seconds: 100, timeLimit: 150, maxCombo: 0 };
  it('3 stars needs accuracy and time', () => {
    expect(computeStars({ ...base, correctFirstTry: 9 })).toBe(3);
    expect(computeStars({ ...base, correctFirstTry: 9, seconds: 200 })).toBe(2);
    expect(computeStars({ ...base, correctFirstTry: 10, hintsUsed: 3 })).toBe(2);
    expect(computeStars({ ...base, correctFirstTry: 3 })).toBe(1);
  });
});

describe('unlocking', () => {
  it('the first world with content is open; later levels need the previous one', () => {
    const p = defaultProgress();
    expect(isWorldUnlocked(p, 'equations')).toBe(true);
    expect(isWorldUnlocked(p, 'powers')).toBe(false);
    expect(isLevelUnlocked(p, levelById('eq-1')!)).toBe(true);
    expect(isLevelUnlocked(p, levelById('eq-2')!)).toBe(false);
    expect(nextLevel(p)?.id).toBe('eq-1');
    p.levelStars['eq-1'] = 2;
    expect(isLevelUnlocked(p, levelById('eq-2')!)).toBe(true);
    expect(nextLevel(p)?.id).toBe('eq-2');
  });
  it('manual unlock by parent', () => {
    const p = defaultProgress();
    p.parent.manualUnlocks = ['powers'];
    expect(isWorldUnlocked(p, 'powers')).toBe(true);
  });
});

describe('reward goals', () => {
  const reward = (goal: Reward['goal'], xpAtCreation = 0): Reward => ({ id: 'r', title: 't', icon: '🍦', description: '', goal, status: 'active', createdAt: 0, xpAtCreation });
  it('xp counts only what was earned after creation', () => {
    const p = { ...defaultProgress(), xp: 700 };
    const g = goalProgress(reward({ type: 'xp', amount: 500 }, 500), p);
    expect(g.current).toBe(200);
    expect(g.done).toBe(false);
    expect(g.label).toBe('עוד 300 XP');
  });
  it('boss goal', () => {
    const p = defaultProgress();
    expect(goalProgress(reward({ type: 'boss', worldId: 'equations' }), p).done).toBe(false);
    p.bossDefeated.equations = { at: 1, noHints: false };
    expect(goalProgress(reward({ type: 'boss', worldId: 'equations' }), p).done).toBe(true);
  });
  it('accuracy goal needs enough attempts', () => {
    const p = defaultProgress();
    p.topicStats.equations = { attempts: 10, correct: 10 };
    expect(goalProgress(reward({ type: 'accuracy', topic: 'equations', percent: 80 }), p).done).toBe(false);
    p.topicStats.equations = { attempts: 40, correct: 34 };
    expect(goalProgress(reward({ type: 'accuracy', topic: 'equations', percent: 80 }), p).done).toBe(true);
  });
});
