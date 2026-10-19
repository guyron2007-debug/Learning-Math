import katex from 'katex';
import { memo, useMemo } from 'react';

function render(latex: string, displayMode = false): string {
  return katex.renderToString(latex, { throwOnError: false, displayMode, strict: false });
}

/** A formula, always laid out left-to-right. */
export const MathInline = memo(function MathInline({ latex }: { latex: string }) {
  const html = useMemo(() => render(latex), [latex]);
  return <span className="math" dangerouslySetInnerHTML={{ __html: html }} />;
});

export const MathBlock = memo(function MathBlock({ latex, className = '' }: { latex: string; className?: string }) {
  const html = useMemo(() => render(latex, true), [latex]);
  return <div dir="ltr" className={`math-block overflow-x-auto py-2 ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
});

/** Hebrew text with inline formulas between $...$. */
export const RichText = memo(function RichText({ text, className }: { text: string; className?: string }) {
  const parts = useMemo(() => text.split('$'), [text]);
  return (
    <span className={className}>
      {parts.map((part, i) => (i % 2 === 1 ? <MathInline key={i} latex={part} /> : <span key={i}>{part}</span>))}
    </span>
  );
});
