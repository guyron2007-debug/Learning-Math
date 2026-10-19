import { useEffect } from 'react';
import { play } from '../audio/sound';
import { MathInline } from './Math';

export type KeypadMode = 'number' | 'expression';

const NUMBER_ROWS = [
  ['7', '8', '9', '/'],
  ['4', '5', '6', '-'],
  ['1', '2', '3', '.'],
  ['0', '⌫'],
];
const EXPRESSION_KEYS = ['x', 'y', '^', '√', '(', ')', '+', '±'];

/** Shows what was typed as math: "3/4" → ¾, "x^2" → x². */
export function inputToLatex(s: string): string {
  return s
    .replace(/√\(?/g, '\\sqrt{')
    .replace(/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)/g, '\\frac{$1}{$2}')
    .replace(/\^(\d+|[a-z])/g, '^{$1}')
    .replace(/\*/g, '\\cdot ')
    .replace(/±/g, '\\pm ')
    .concat('}'.repeat((s.match(/√/g) ?? []).length));
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  mode?: KeypadMode;
  disabled?: boolean;
}

export function MathKeypad({ value, onChange, onSubmit, mode = 'number', disabled }: Props) {
  const press = (key: string) => {
    if (disabled) return;
    play('click');
    if (key === '⌫') onChange(value.slice(0, -1));
    else if (key === '√') onChange(value + '√(');
    else if (value.length < 24) onChange(value + key);
  };

  // Physical keyboard support.
  useEffect(() => {
    if (disabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const allowed = mode === 'number' ? /^[0-9./-]$/ : /^[0-9./\-+xy^()*]$/;
      if (e.key === 'Enter') {
        e.preventDefault();
        onSubmit();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        onChange(value.slice(0, -1));
      } else if (allowed.test(e.key) && value.length < 24) {
        e.preventDefault();
        onChange(value + e.key);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [value, onChange, onSubmit, mode, disabled]);

  const keyClass =
    'min-h-14 rounded-2xl bg-white text-2xl font-bold shadow-[0_3px_0_#ddd6fe] active:translate-y-0.5 active:shadow-none dark:bg-violet-900 dark:shadow-[0_3px_0_#2e1065] disabled:opacity-40';

  return (
    <div className="mx-auto w-full max-w-sm select-none">
      <div className="mb-3 flex min-h-16 items-center justify-center rounded-2xl border-2 border-violet-300 bg-violet-50 px-4 text-3xl dark:border-violet-700 dark:bg-violet-950" aria-live="polite">
        {value ? <MathInline latex={inputToLatex(value)} /> : <span className="text-lg text-violet-400">הקלידי תשובה</span>}
      </div>
      {mode === 'expression' && (
        <div className="mb-2 grid grid-cols-4 gap-2" dir="ltr">
          {EXPRESSION_KEYS.map((k) => (
            <button key={k} className={keyClass} onClick={() => press(k)} disabled={disabled}>
              {k}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-4 gap-2" dir="ltr">
        {NUMBER_ROWS.flat().map((k) => (
          <button key={k} className={`${keyClass} ${k === '0' ? 'col-span-2' : ''}`} onClick={() => press(k)} disabled={disabled} aria-label={k === '⌫' ? 'מחיקה' : k}>
            {k === '/' ? '½' : k}
          </button>
        ))}
        <button
          className="col-span-1 min-h-14 rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 text-2xl font-bold text-white shadow-[0_3px_0_#065f46] active:translate-y-0.5 active:shadow-none disabled:opacity-40"
          onClick={onSubmit}
          disabled={disabled || !value}
          aria-label="בדיקה"
        >
          ✓
        </button>
      </div>
    </div>
  );
}
