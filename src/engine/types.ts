import type { Rng } from './rng';
import type { Distractor, HelpStep, SkillId, SolutionPath } from '../tutor/types';
import type { FinalValues } from '../tutor/leak';

export type TopicId =
  | 'powers'
  | 'shortMult'
  | 'algFractions'
  | 'equations'
  | 'quadratic'
  | 'geometry'
  | 'trig'
  | 'probability'
  | 'wordProblems';

export type Difficulty = 1 | 2 | 3 | 4 | 5;

/**
 * Text fields are "rich text": Hebrew prose with inline LaTeX between $...$.
 * `latex` fields are pure LaTeX.
 */
export type QuestionAnswer =
  | { kind: 'number'; value: number; display: string }
  | { kind: 'choice'; options: string[]; correctIndex: number }
  | { kind: 'expression'; value: string; display: string; variables: string[] };

export interface Question {
  kind: 'question';
  generatorId: string;
  topic: TopicId;
  difficulty: Difficulty;
  prompt: string;
  latex?: string;
  answer: QuestionAnswer;
  /** Full worked solution ("הראי לי איך"), shown only after the help ladder is exhausted. */
  solution: string[];
  skills: SkillId[];
  /** Expected wrong answers with misconception codes (spec B.3.2). Never equal to the answer. */
  distractors: Distractor[];
  /** One or more ways to solve it, each a list of help steps (spec B.4.6). */
  solutionPaths: SolutionPath[];
  /** The final answer's values, used to make sure help never reveals them. */
  finalValues: FinalValues;
}

export interface Step {
  prompt: string;
  options: string[];
  correctIndex: number;
  /** Misconception code per option (null for the correct option or an unclassified one). */
  optionCodes: (string | null)[];
  help: HelpStep;
  explanation: string;
  /** How the step reads in the solved-steps history; defaults to the correct option. */
  summary?: string;
}

export interface StepProblem {
  kind: 'steps';
  generatorId: string;
  topic: TopicId;
  difficulty: Difficulty;
  prompt: string;
  latex: string;
  steps: Step[];
  finalAnswer: string;
  skills: SkillId[];
  finalValues: FinalValues;
}

export type PlayItem = Question | StepProblem;

export interface GeneratorDef<T extends PlayItem = PlayItem> {
  id: string;
  topic: TopicId;
  title: string;
  minDifficulty: Difficulty;
  maxDifficulty: Difficulty;
  generate: (difficulty: Difficulty, rng: Rng) => T;
}

export const clampDifficulty = (d: number, min: Difficulty = 1, max: Difficulty = 5): Difficulty =>
  Math.min(max, Math.max(min, Math.round(d))) as Difficulty;
