import { type Q, toQ, qLatex, isZero } from './rational';

export type Coef = Q | number;

function coefLatex(c: Coef, variable: string): string {
  const x = toQ(c);
  const abs = { n: Math.abs(x.n), d: x.d };
  if (!variable) return qLatex(abs);
  if (abs.n === 1 && abs.d === 1) return variable;
  return qLatex(abs) + variable;
}

/**
 * Formats a sum of terms as LaTeX, e.g. linExpr([[3,'x'],[-5,'']]) → "3x - 5".
 * Zero terms are skipped; an empty sum is "0".
 */
export function linExpr(terms: Array<[Coef, string]>): string {
  let out = '';
  for (const [c, v] of terms) {
    if (isZero(c)) continue;
    const negative = toQ(c).n < 0;
    const body = coefLatex(c, v);
    if (!out) out = negative ? `-${body}` : body;
    else out += negative ? ` - ${body}` : ` + ${body}`;
  }
  return out || '0';
}

/** a(x + b) style product: "3(x - 2)", "-(x + 4)", "x + 1" when a = 1. */
export function scaled(a: number, inner: string): string {
  if (a === 1) return inner;
  if (a === -1) return `-(${inner})`;
  return `${a}(${inner})`;
}

/** A number as it should appear after a binary operator: negative values get parentheses. */
export function paren(n: Coef): string {
  return toQ(n).n < 0 ? `(${qLatex(n)})` : qLatex(n);
}

/** Wraps LaTeX as inline rich text. */
export const m = (latex: string) => `$${latex}$`;
