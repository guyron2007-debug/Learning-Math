/**
 * "הקוסם המדריך" — rule-based tutor types (spec part B, sections 3–4).
 * Text fields are rich text (Hebrew with inline LaTeX between $...$).
 */

export type SkillId =
  | 'distribute'
  | 'combine-like-terms'
  | 'move-term-sign'
  | 'divide-coefficient'
  | 'common-denominator'
  | 'clear-denominator'
  | 'domain-restriction'
  | 'cross-multiply'
  | 'inequality-flip'
  | 'two-eq-substitution'
  | 'two-eq-elimination'
  | 'back-substitute'
  // Later worlds (spec B.3.1); tagged once their generators exist.
  | 'factor-common'
  | 'factor-trinomial'
  | 'short-mult-square'
  | 'quadratic-formula'
  | 'discriminant';

/** Help ladder rungs (B.4.2): guiding question, rule reminder, parallel example, fill-in-the-blank. */
export type HelpLevel = 0 | 1 | 2 | 3;
export type HelpType = 'guiding' | 'rule' | 'example' | 'blank' | 'subStep';
export const HELP_TYPE_BY_LEVEL: Record<HelpLevel, HelpType> = { 0: 'guiding', 1: 'rule', 2: 'example', 3: 'blank' };

/** A formula with one empty box (\square) that the student fills in with a number. */
export interface Blank {
  latex: string;
  answer: number;
}

export interface HelpStep {
  skill: SkillId;
  /** Short name for the step, e.g. "פתיחת סוגריים". */
  label: string;
  /** Rungs 0–2 of the ladder. Rung 3 is the blank. */
  hints: [string, string, string];
  blank: Blank;
  /** Smaller pieces, used when the student fails the blank twice (B.4.3.5). */
  subSteps: string[];
  /** Targeted reminder per misconception code, used after a diagnosis (B.4.3.1). */
  fixes?: Record<string, string>;
}

export interface SolutionPath {
  id: string;
  title: string;
  steps: HelpStep[];
}

/** An expected wrong answer and the misconception it reveals (B.3.2). */
export interface Distractor {
  code: string;
  /** A number for typed answers; the option's text for multiple choice. */
  value: number | string;
}

export interface SkillState {
  mastery: number;
  attempts: number;
  lastSeen: string;
  helpLevelNeeded: number;
}

export interface LearnerProfile {
  schemaVersion: 1;
  skills: Partial<Record<SkillId, SkillState>>;
  misconceptions: Record<string, { count: number; lastSeen: string }>;
  /** How often each kind of help was followed by a success on the next try (B.3.3). */
  helpTypes: Partial<Record<HelpType, { given: number; succeeded: number }>>;
}
