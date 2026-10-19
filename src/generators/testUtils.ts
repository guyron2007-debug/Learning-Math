import { evaluate } from 'mathjs';

/** Converts the small LaTeX subset our generators emit into a mathjs expression. */
export function latexToMath(latex: string): string {
  let s = latex;
  // \frac{a}{b} → ((a)/(b)); loop handles nesting from the inside out.
  const frac = /\\frac\{([^{}]*)\}\{([^{}]*)\}/;
  while (frac.test(s)) s = s.replace(frac, '(($1)/($2))');
  return s.replace(/\\cdot/g, '*').replace(/\\left|\\right/g, '').trim();
}

export function evalAt(latex: string, scope: Record<string, number>): number {
  return evaluate(latexToMath(latex), { ...scope }) as number;
}

/** True if "lhs = rhs" holds for the given variable values. */
export function equationHolds(latex: string, scope: Record<string, number>): boolean {
  const [lhs, rhs] = latex.split('=');
  return Math.abs(evalAt(lhs, scope) - evalAt(rhs, scope)) < 1e-9;
}

const OPS: Record<string, (a: number, b: number) => boolean> = {
  '\\le': (a, b) => a <= b + 1e-12,
  '\\ge': (a, b) => a >= b - 1e-12,
  '<': (a, b) => a < b - 1e-12,
  '>': (a, b) => a > b + 1e-12,
};

export function splitInequality(latex: string): { lhs: string; op: string; rhs: string } {
  const match = latex.match(/^(.*?)\s(\\le|\\ge|<|>)\s(.*)$/);
  if (!match) throw new Error(`Not an inequality: ${latex}`);
  return { lhs: match[1], op: match[2], rhs: match[3] };
}

export function inequalityHolds(latex: string, x: number): boolean {
  const { lhs, op, rhs } = splitInequality(latex);
  return OPS[op](evalAt(lhs, { x }), evalAt(rhs, { x }));
}

/** Strips the $...$ rich-text wrapper. */
export const unwrap = (rich: string) => rich.replace(/^\$|\$$/g, '');

export function parseCases(latex: string): string[] {
  return latex
    .replace('\\begin{cases}', '')
    .replace('\\end{cases}', '')
    .split('\\\\')
    .map((l) => l.trim());
}
