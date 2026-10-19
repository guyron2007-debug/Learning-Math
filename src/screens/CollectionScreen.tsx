import { CARDS } from '../content/cards';
import { WORLDS } from '../content/worlds';
import { useGame } from '../store/gameStore';
import { Card } from '../components/ui';
import { RichText } from '../components/Math';

export function CollectionScreen() {
  const owned = useGame((s) => s.progress.cards);
  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold">🃏 האוסף שלי</h1>
      <p className="mb-4 text-violet-600 dark:text-violet-300">
        כל בוס שתנצחי מעניק קלף של מתמטיקאי או מתמטיקאית מפורסמים ({owned.length}/{CARDS.length})
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {CARDS.map((c) => {
          const has = owned.includes(c.id);
          const world = WORLDS.find((w) => w.cardId === c.id);
          return has ? (
            <Card key={c.id} className="bg-gradient-to-br from-amber-50 to-violet-50 dark:from-amber-950/40 dark:to-violet-950">
              <div className="flex items-center gap-3">
                <span className="text-5xl">{c.emoji}</span>
                <div>
                  <p className="text-lg font-extrabold">{c.name}</p>
                  <p className="text-xs text-violet-500">{c.era}</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed">
                <RichText text={c.fact} />
              </p>
            </Card>
          ) : (
            <Card key={c.id} className="flex items-center gap-3 opacity-70">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-3xl font-extrabold text-violet-400 dark:bg-violet-900">?</span>
              <p className="text-sm text-violet-600 dark:text-violet-300">נצחי את הבוס של {world?.emoji} {world?.name} כדי לגלות</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
