import { parse } from './mathjs';

/** Converts the small LaTeX subset our generators emit into a math.js expression. */
export function latexToMath(latex: string): string {
  let s = latex;
  // \frac{a}{b} → ((a)/(b)); the loop handles nesting from the inside out.
  const frac = /\\frac\{([^{}]*)\}\{([^{}]*)\}/;
  while (frac.test(s)) s = s.replace(frac, '(($1)/($2))');
  return s
    .replace(/\\cdot|\\times/g, '*')
    .replace(/\\left|\\right/g, '')
    .replace(/\\[,;!]|\\quad/g, ' ')
    .replace(/[−–]/g, '-')
    .replace(/[{}]/g, (c) => (c === '{' ? '(' : ')'))
    .trim();
}

/** Evaluates a LaTeX expression; returns null if it isn't a plain computable expression. */
export function evalLatex(latex: string, scope: Record<string, number> = {}): number | null {
  try {
    const v = parse(latexToMath(latex)).compile().evaluate({ ...scope });
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}
