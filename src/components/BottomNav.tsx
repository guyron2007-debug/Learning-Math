import { play } from '../audio/sound';
import { useUi, type Screen } from '../store/ui';

const TABS: Array<{ screen: Screen['name']; label: string; icon: string }> = [
  { screen: 'home', label: 'בית', icon: '🏠' },
  { screen: 'map', label: 'מפה', icon: '🗺️' },
  { screen: 'rewards', label: 'פרסים', icon: '🎁' },
  { screen: 'collection', label: 'אוסף', icon: '🃏' },
  { screen: 'achievements', label: 'הישגים', icon: '🏅' },
  { screen: 'settings', label: 'הגדרות', icon: '⚙️' },
];

export function BottomNav() {
  const { screen, go } = useUi();
  const active = screen.name === 'world' ? 'map' : screen.name;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-violet-100 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-violet-900 dark:bg-indigo-950/90">
      <div className="mx-auto flex max-w-3xl justify-around">
        {TABS.map((t) => (
          <button
            key={t.screen}
            onClick={() => {
              play('click');
              go({ name: t.screen } as Screen);
            }}
            className={`flex min-w-14 flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium transition ${active === t.screen ? 'text-violet-700 dark:text-violet-200' : 'text-gray-500 dark:text-gray-400'}`}
            aria-current={active === t.screen ? 'page' : undefined}
          >
            <span className={`text-2xl transition ${active === t.screen ? 'scale-110' : 'opacity-70 grayscale-[40%]'}`}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
