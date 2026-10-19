import { evalLatex } from '../engine/latex';

export function evalAt(latex: string, scope: Record<string, number>): number {
  const v = evalLatex(latex, scope);
  if (v === null) throw new Error(`Cannot evaluate: ${latex}`);
  return v;
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
