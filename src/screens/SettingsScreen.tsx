import { useGame } from '../store/gameStore';
import { useUi } from '../store/ui';
import { Button, Card } from '../components/ui';
import { play } from '../audio/sound';

const AVATARS = ['🧙‍♀️', '🧝‍♀️', '🦊', '🐱', '🦄', '🐉', '🦉', '🐼', '🚀', '🌟'];

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="flex justify-between font-medium">
        {label} <span className="text-violet-500">{Math.round(value * 100)}%</span>
      </span>
      <input type="range" min={0} max={1} step={0.05} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 w-full accent-violet-600" />
    </label>
  );
}

export function SettingsScreen() {
  const { profile, settings } = useGame((s) => s.progress);
  const setProfile = useGame((s) => s.setProfile);
  const setSettings = useGame((s) => s.setSettings);
  const go = useUi((s) => s.go);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">⚙️ הגדרות</h1>

      <Card className="space-y-4">
        <h2 className="text-lg font-bold">הדמות שלי</h2>
        <label className="block">
          <span className="font-medium">שם</span>
          <input
            value={profile.name}
            maxLength={20}
            onChange={(e) => setProfile({ name: e.target.value })}
            className="mt-1 w-full rounded-2xl border-2 border-violet-200 bg-white px-4 py-3 text-lg dark:border-violet-800 dark:bg-violet-950"
          />
        </label>
        <div>
          <span className="font-medium">אווטאר</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {AVATARS.map((a) => (
              <button
                key={a}
                onClick={() => {
                  play('click');
                  setProfile({ avatar: a });
                }}
                className={`flex h-14 w-14 items-center justify-center rounded-2xl text-3xl transition ${profile.avatar === a ? 'bg-violet-200 ring-4 ring-violet-400 dark:bg-violet-800' : 'bg-violet-50 dark:bg-violet-950'}`}
                aria-label={`אווטאר ${a}`}
                aria-pressed={profile.avatar === a}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-bold">צליל ותצוגה</h2>
        <Slider label="🎵 מוזיקה" value={settings.musicVolume} onChange={(v) => setSettings({ musicVolume: v })} />
        <Slider
          label="🔊 אפקטים"
          value={settings.sfxVolume}
          onChange={(v) => {
            setSettings({ sfxVolume: v });
            play('correct');
          }}
        />
        <label className="flex items-center justify-between">
          <span className="font-medium">🌙 מצב כהה</span>
          <input type="checkbox" checked={settings.dark} onChange={(e) => setSettings({ dark: e.target.checked })} className="h-6 w-6 accent-violet-600" />
        </label>
        <label className="flex items-center justify-between gap-3">
          <span className="font-medium">🧙 הקוסם מנצנץ כשאני חושבת יותר מדקה</span>
          <input type="checkbox" checked={settings.wizardNudge} onChange={(e) => setSettings({ wizardNudge: e.target.checked })} className="h-6 w-6 accent-violet-600" />
        </label>
        <div>
          <span className="font-medium">גודל טקסט</span>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(['sm', 'md', 'lg'] as const).map((size) => (
              <button
                key={size}
                onClick={() => setSettings({ textSize: size })}
                className={`rounded-2xl py-3 font-bold ${settings.textSize === size ? 'bg-violet-600 text-white' : 'bg-violet-50 dark:bg-violet-950'}`}
                aria-pressed={settings.textSize === size}
              >
                <span className={size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base'}>א</span> {size === 'sm' ? 'קטן' : size === 'md' ? 'רגיל' : 'גדול'}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Button variant="secondary" className="w-full" onClick={() => go({ name: 'parent' })}>
        🔒 אזור הורים
      </Button>
    </div>
  );
}
