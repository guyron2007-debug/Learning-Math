import type { Rng } from './rng';

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
  hints: [string, string, string];
  solution: string[];
}

export interface Step {
  prompt: string;
  options: string[];
  correctIndex: number;
  hint: string;
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
