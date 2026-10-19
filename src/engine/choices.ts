import { type Rng, shuffle } from './rng';

export interface Choices {
  options: string[];
  correctIndex: number;
}

/**
 * Builds a shuffled multiple-choice list from the correct answer and plausible distractors.
 * Duplicates are dropped; `fallback` supplies more distractors if there are not enough.
 */
export function makeChoices(
  rng: Rng,
  correct: string,
  distractors: string[],
  fallback: () => string,
  count = 4,
): Choices {
  const seen = new Set([correct]);
  const wrong: string[] = [];
  for (const d of distractors) {
    if (wrong.length >= count - 1) break;
    if (!seen.has(d)) {
      seen.add(d);
      wrong.push(d);
    }
  }
  for (let i = 0; wrong.length < count - 1 && i < 200; i++) {
    const d = fallback();
    if (!seen.has(d)) {
      seen.add(d);
      wrong.push(d);
    }
  }
  const options = shuffle(rng, [correct, ...wrong]);
  return { options, correctIndex: options.indexOf(correct) };
}
