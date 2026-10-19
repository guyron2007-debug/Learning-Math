import { numbersEqual } from '../engine/check';
import { type Q, toNumber } from '../engine/rational';
import type { Distractor } from './types';

/**
 * Builds the numeric distractor list: drops candidates that are undefined (division by zero),
 * equal to the correct answer, or duplicate another candidate's value.
 */
export function numericDistractors(answer: number, candidates: Array<[string, (() => Q | number) | null]>): Distractor[] {
  const out: Distractor[] = [];
  for (const [code, compute] of candidates) {
    if (!compute) continue;
    let value: number;
    try {
      value = toNumber(compute());
    } catch {
      continue;
    }
    if (!Number.isFinite(value) || numbersEqual(value, answer)) continue;
    if (out.some((d) => numbersEqual(d.value as number, value))) continue;
    out.push({ code, value });
  }
  return out;
}
