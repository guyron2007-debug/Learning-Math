/**
 * The rule-based help engine (spec B.4.3): diagnose a wrong answer, pick the solution path
 * that is easiest for her, choose where on the ladder to start, and walk the ladder.
 * Everything here is pure and deterministic.
 */
import type { Question } from '../engine/types';
import { numbersEqual, parseNumber } from '../engine/check';
import { HELP_TYPE_BY_LEVEL, type Blank, type HelpLevel, type HelpStep, type HelpType, type LearnerProfile, type SkillId, type SolutionPath } from './types';
import { effectiveMastery, helpSuccessRate } from './profile';
import { findLeak, type FinalValues } from './leak';

/** Matches a wrong answer (typed text or chosen option index) to a known misconception. */
export function diagnose(q: Question, answer: string | number): string | null {
  if (q.answer.kind === 'choice') {
    const text = typeof answer === 'number' ? q.answer.options[answer] : answer;
    return q.distractors.find((d) => d.value === text)?.code ?? null;
  }
  const value = typeof answer === 'number' ? answer : parseNumber(answer);
  if (value === null) return null;
  return q.distractors.find((d) => typeof d.value === 'number' && numbersEqual(d.value, value))?.code ?? null;
}

const pathMastery = (path: SolutionPath, p: LearnerProfile, now: Date) =>
  path.steps.reduce((sum, s) => sum + effectiveMastery(p, s.skill, now), 0) / Math.max(1, path.steps.length);

/** "The easiest way for her": highest average mastery of the path's skills; ties go to the shorter path. */
export function choosePath(paths: SolutionPath[], p: LearnerProfile, now = new Date()): SolutionPath {
  return paths.reduce((best, path) => {
    const a = pathMastery(path, p, now);
    const b = pathMastery(best, p, now);
    if (a > b + 1e-9) return path;
    if (Math.abs(a - b) <= 1e-9 && path.steps.length < best.steps.length) return path;
    return best;
  });
}

/** Where on the ladder to start for a skill: strong → a guiding question; weak → a parallel example. */
export function openingLevel(p: LearnerProfile, skill: SkillId, now = new Date()): HelpLevel {
  const mastery = effectiveMastery(p, skill, now);
  if (mastery >= 0.7) return 0;
  if (mastery < 0.4) return 2;
  // In the middle band, prefer the kind of help that has worked better for her (B.3.3).
  const example = helpSuccessRate(p, 'example');
  const rule = helpSuccessRate(p, 'rule');
  return example !== null && rule !== null && example > rule + 0.15 ? 2 : 1;
}

export type TutorMode = 'ladder' | 'subSteps' | 'ready' | 'exhausted';

export interface TutorSession {
  pathId: string;
  stepIndex: number;
  level: HelpLevel;
  mode: TutorMode;
  subStepIndex: number;
  blankFailures: number;
  diagnosis: string | null;
  /** Highest rung reached on any step (−1 = no help yet). */
  maxLevel: number;
  shown: HelpType[];
}

export type HelpItem =
  | { kind: 'hint'; type: HelpType; text: string; step: HelpStep; stepIndex: number; stepCount: number }
  | { kind: 'blank'; type: 'blank'; blank: Blank; step: HelpStep; stepIndex: number; stepCount: number }
  | { kind: 'subStep'; type: 'subStep'; text: string; step: HelpStep; stepIndex: number; stepCount: number }
  | { kind: 'ready'; stepCount: number }
  | { kind: 'exhausted'; stepCount: number };

const pathOf = (paths: SolutionPath[], s: TutorSession) => paths.find((p) => p.id === s.pathId) ?? paths[0];

function enterStep(paths: SolutionPath[], s: TutorSession, stepIndex: number, p: LearnerProfile, now: Date, level?: HelpLevel): TutorSession {
  const path = pathOf(paths, s);
  if (stepIndex >= path.steps.length) return { ...s, mode: 'exhausted' };
  const lvl = level ?? openingLevel(p, path.steps[stepIndex].skill, now);
  return {
    ...s,
    stepIndex,
    level: lvl,
    mode: 'ladder',
    subStepIndex: 0,
    blankFailures: 0,
    maxLevel: Math.max(s.maxLevel, lvl),
    shown: [...s.shown, HELP_TYPE_BY_LEVEL[lvl]],
  };
}

/**
 * Starts a help session. With a diagnosis, jumps to the step where that mistake happens and starts
 * with its targeted rule reminder (level 1). Otherwise starts at `fromStep` (the first step she hasn't
 * done; 0 for a plain question) at the level her mastery suggests.
 */
export function startSession(
  paths: SolutionPath[],
  p: LearnerProfile,
  opts: { diagnosis?: string | null; fromStep?: number } = {},
  now = new Date(),
): TutorSession {
  const path = choosePath(paths, p, now);
  const base: TutorSession = { pathId: path.id, stepIndex: 0, level: 0, mode: 'ladder', subStepIndex: 0, blankFailures: 0, diagnosis: opts.diagnosis ?? null, maxLevel: -1, shown: [] };
  const fixAt = opts.diagnosis ? path.steps.findIndex((st) => st.fixes?.[opts.diagnosis!]) : -1;
  if (fixAt >= 0) return enterStep(paths, base, fixAt, p, now, 1);
  return enterStep(paths, { ...base, diagnosis: null }, opts.fromStep ?? 0, p, now);
}

const SAFE_FALLBACK = (step: HelpStep) => `נסי לחשוב רק על הצעד הבא: ${step.label}. מה הדבר הראשון שאפשר לעשות?`;

/** The help to show now. Any text that would reveal the final answer is replaced (belt and braces; tests ensure it never happens). */
export function currentHelp(paths: SolutionPath[], s: TutorSession, finalValues: FinalValues): HelpItem {
  const path = pathOf(paths, s);
  const stepCount = path.steps.length;
  if (s.mode === 'exhausted') return { kind: 'exhausted', stepCount };
  if (s.mode === 'ready') return { kind: 'ready', stepCount };
  const step = path.steps[s.stepIndex];
  const common = { step, stepIndex: s.stepIndex, stepCount };
  const safe = (text: string) => (findLeak(text, finalValues) ? SAFE_FALLBACK(step) : text);
  if (s.mode === 'subSteps') return { kind: 'subStep', type: 'subStep', text: safe(step.subSteps[s.subStepIndex]), ...common };
  if (s.level === 3) return { kind: 'blank', type: 'blank', blank: step.blank, ...common };
  const fix = s.level === 1 && s.diagnosis ? step.fixes?.[s.diagnosis] : undefined;
  return { kind: 'hint', type: HELP_TYPE_BY_LEVEL[s.level], text: safe(fix ?? step.hints[s.level]), ...common };
}

/** "עוד עזרה": the next rung; after the blank, the next step; after the last step, the ladder is exhausted. */
export function moreHelp(paths: SolutionPath[], s: TutorSession, p: LearnerProfile, now = new Date()): TutorSession {
  const path = pathOf(paths, s);
  if (s.mode === 'exhausted') return s;
  if (s.mode === 'ready') return { ...s, mode: 'exhausted' };
  if (s.mode === 'subSteps') {
    const step = path.steps[s.stepIndex];
    if (s.subStepIndex + 1 < step.subSteps.length) return { ...s, subStepIndex: s.subStepIndex + 1, shown: [...s.shown, 'subStep'] };
    return enterStep(paths, s, s.stepIndex + 1, p, now);
  }
  if (s.level < 3) {
    const level = (s.level + 1) as HelpLevel;
    return { ...s, level, maxLevel: Math.max(s.maxLevel, level), shown: [...s.shown, HELP_TYPE_BY_LEVEL[level]] };
  }
  return enterStep(paths, s, s.stepIndex + 1, p, now);
}

/**
 * She filled in the blank. Right → on to the next step (or "ready" after the last one: she now does
 * the final step herself). Wrong twice → the step is broken into smaller sub-steps (B.4.3.5).
 */
export function answerBlank(paths: SolutionPath[], s: TutorSession, raw: string, p: LearnerProfile, now = new Date()): { session: TutorSession; correct: boolean } {
  const path = pathOf(paths, s);
  const step = path.steps[s.stepIndex];
  const value = parseNumber(raw);
  const correct = value !== null && numbersEqual(value, step.blank.answer);
  if (correct) {
    const last = s.stepIndex + 1 >= path.steps.length;
    return { correct, session: last ? { ...s, mode: 'ready' } : enterStep(paths, s, s.stepIndex + 1, p, now) };
  }
  const blankFailures = s.blankFailures + 1;
  if (blankFailures >= 2 && step.subSteps.length) {
    return { correct, session: { ...s, blankFailures, mode: 'subSteps', subStepIndex: 0, shown: [...s.shown, 'subStep'] } };
  }
  return { correct, session: { ...s, blankFailures } };
}

/** 0 = no help … 4 = the whole ladder (B.3.1 helpLevelNeeded). */
export const helpRungs = (s: TutorSession | null) => (s ? Math.min(4, s.maxLevel + 1) : 0);

/**
 * Spec API (B.9): the next help item for a question. Starts a session on first call
 * (diagnosing `lastWrongAnswer` if given) or advances an existing one.
 */
export function getNextHelp(
  q: Pick<Question, 'solutionPaths' | 'finalValues'> & Partial<Question>,
  session: TutorSession | null,
  profile: LearnerProfile,
  lastWrongAnswer?: string | number,
  now = new Date(),
): { item: HelpItem; session: TutorSession } {
  const next = session
    ? moreHelp(q.solutionPaths, session, profile, now)
    : startSession(q.solutionPaths, profile, { diagnosis: lastWrongAnswer !== undefined && q.answer ? diagnose(q as Question, lastWrongAnswer) : null }, now);
  return { session: next, item: currentHelp(q.solutionPaths, next, q.finalValues) };
}
