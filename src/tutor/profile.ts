import type { HelpType, LearnerProfile, SkillId, SkillState } from './types';

export const MASTERY_START = 0.5;
const DECAY_PER_WEEK = 0.02;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
/** A misconception that happened this many times is "active" (shown to the parent). */
export const ACTIVE_MISCONCEPTION = 3;

export function defaultLearner(): LearnerProfile {
  return { schemaVersion: 1, skills: {}, misconceptions: {}, helpTypes: {} };
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function skillState(p: LearnerProfile, skill: SkillId): SkillState {
  return p.skills[skill] ?? { mastery: MASTERY_START, attempts: 0, lastSeen: '', helpLevelNeeded: 0 };
}

/** Mastery after a gentle decay (−0.02 per week unpracticed), so old skills come back for review. */
export function effectiveMastery(p: LearnerProfile, skill: SkillId, now = new Date()): number {
  const s = skillState(p, skill);
  if (!s.lastSeen) return s.mastery;
  const weeks = Math.max(0, now.getTime() - new Date(s.lastSeen).getTime()) / WEEK_MS;
  return clamp01(s.mastery - DECAY_PER_WEEK * Math.floor(weeks));
}

export function masteryDelta(correct: boolean, helpRungs: number): number {
  if (!correct) return -0.05;
  if (helpRungs === 0) return 0.08;
  if (helpRungs === 1) return 0.04;
  return 0.01;
}

export interface Outcome {
  skills: SkillId[];
  correct: boolean;
  /** How far up the ladder she needed to go: 0 = no help … 4 = the whole ladder. */
  helpRungs: number;
  misconception?: string | null;
  /** Kinds of help shown before this attempt. */
  helpTypes?: HelpType[];
}

export function recordOutcome(p: LearnerProfile, o: Outcome, now = new Date()): LearnerProfile {
  const iso = now.toISOString();
  const skills = { ...p.skills };
  for (const skill of new Set(o.skills)) {
    const s = skillState(p, skill);
    skills[skill] = {
      mastery: clamp01(effectiveMastery(p, skill, now) + masteryDelta(o.correct, o.helpRungs)),
      attempts: s.attempts + 1,
      lastSeen: iso,
      helpLevelNeeded: s.attempts === 0 ? o.helpRungs : 0.7 * s.helpLevelNeeded + 0.3 * o.helpRungs,
    };
  }
  const misconceptions = { ...p.misconceptions };
  if (o.misconception) {
    const prev = misconceptions[o.misconception];
    misconceptions[o.misconception] = { count: (prev?.count ?? 0) + 1, lastSeen: iso };
  }
  const helpTypes = { ...p.helpTypes };
  for (const t of new Set(o.helpTypes ?? [])) {
    const prev = helpTypes[t] ?? { given: 0, succeeded: 0 };
    helpTypes[t] = { given: prev.given + 1, succeeded: prev.succeeded + (o.correct ? 1 : 0) };
  }
  return { ...p, skills, misconceptions, helpTypes };
}

export function activeMisconceptions(p: LearnerProfile): string[] {
  return Object.entries(p.misconceptions)
    .filter(([, v]) => v.count >= ACTIVE_MISCONCEPTION)
    .map(([code]) => code);
}

/** Success rate after a kind of help, or null with too little data. */
export function helpSuccessRate(p: LearnerProfile, type: HelpType, minSamples = 4): number | null {
  const s = p.helpTypes[type];
  return s && s.given >= minSamples ? s.succeeded / s.given : null;
}
