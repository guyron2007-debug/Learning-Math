import { evalLatex } from '../engine/latex';
import { numbersEqual } from '../engine/check';

/** Final values of the question's unknowns, e.g. { x: 4 } or { x: 2, y: -1 }. */
export type FinalValues = Record<string, number>;

const RELATION = /(\\neq|\\le|\\ge|=|<|>)/;

function mathSegments(text: string): string[] {
  if (!text.includes('$')) return [text];
  return text.split('$').filter((_, i) => i % 2 === 1);
}

const isVar = (s: string, values: FinalValues) => s in values;

/** "(x, y)" and "(3, -2)" → ["x","y"] / ["3","-2"] */
function tuple(s: string): string[] | null {
  const m = s.match(/^\((.*)\)$/);
  if (!m) return null;
  const parts = m[1].split(',').map((p) => p.trim());
  return parts.length > 1 ? parts : null;
}

function statesValue(name: string, expr: string, values: FinalValues): boolean {
  const v = evalLatex(expr);
  return v !== null && numbersEqual(v, values[name]);
}

/**
 * Returns the offending formula if `text` states the final answer — "x = 4", "4 = x", "x > 4"
 * when the answer bound is 4, or "(x, y) = (2, -1)" — in any equivalent form ("x = \frac{8}{2}").
 * Coefficients that merely happen to equal the answer are not leaks.
 */
export function findLeak(text: string, values: FinalValues): string | null {
  for (const seg of mathSegments(text)) {
    const parts = seg.split(RELATION).map((p) => p.trim());
    for (let i = 1; i < parts.length; i += 2) {
      if (parts[i] === '\\neq') continue;
      const left = parts[i - 1];
      const right = parts[i + 1];
      if (isVar(left, values) && statesValue(left, right, values)) return seg;
      if (isVar(right, values) && statesValue(right, left, values)) return seg;
      const names = tuple(left);
      const nums = tuple(right);
      if (names && nums && names.length === nums.length && names.every((n) => isVar(n, values))) {
        if (names.some((n, k) => statesValue(n, nums[k], values))) return seg;
      }
    }
  }
  return null;
}
