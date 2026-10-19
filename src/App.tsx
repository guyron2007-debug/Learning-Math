import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { useGame } from './store/gameStore';
import { useUi } from './store/ui';
import { setVolumes, startMusic, unlockAudio } from './audio/sound';
import { TopBar } from './components/TopBar';
import { BottomNav } from './components/BottomNav';
import { TreasureChestHost } from './components/TreasureChest';
import { Splash } from './screens/Splash';
import { Home } from './screens/Home';
import { MapScreen } from './screens/MapScreen';
import { WorldScreen } from './screens/WorldScreen';
import { PlayScreen } from './screens/play/PlayScreen';
import { Review } from './screens/play/Review';
import { RewardsScreen } from './screens/RewardsScreen';
import { CollectionScreen } from './screens/CollectionScreen';
import { AchievementsScreen } from './screens/AchievementsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { ParentScreen } from './screens/ParentScreen';

const TEXT_SIZE = { sm: '14px', md: '16px', lg: '19px' };

function useApplySettings() {
  const settings = useGame((s) => s.progress.settings);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.dark);
    document.documentElement.style.setProperty('--root-size', TEXT_SIZE[settings.textSize]);
    setVolumes(settings.sfxVolume, settings.musicVolume);
  }, [settings]);

  // Browsers keep audio muted until the first interaction.
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);
}

export default function App() {
  const screen = useUi((s) => s.screen);
  const go = useUi((s) => s.go);
  useApplySettings();

  const playing = screen.name === 'play' || screen.name === 'review';
  const musicKey = screen.name === 'play' || screen.name === 'world' ? null : 'home';
  useEffect(() => {
    if (musicKey) startMusic('home');
  }, [musicKey]);

  if (screen.name === 'splash') return <Splash onDone={() => go({ name: 'home' })} />;

  if (screen.name === 'play') return <PlayScreen key={screen.levelId} levelId={screen.levelId} />;

  const key = screen.name === 'world' ? `world-${screen.worldId}` : screen.name;
  return (
    <div className="min-h-dvh pb-24">
      <TopBar />
      <main className="mx-auto max-w-3xl px-4 pt-4">
        <AnimatePresence mode="wait">
          <motion.div key={key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
            {screen.name === 'home' && <Home />}
            {screen.name === 'map' && <MapScreen />}
            {screen.name === 'world' && <WorldScreen worldId={screen.worldId} />}
            {screen.name === 'review' && <Review onExit={() => go({ name: 'home' })} />}
            {screen.name === 'rewards' && <RewardsScreen />}
            {screen.name === 'collection' && <CollectionScreen />}
            {screen.name === 'achievements' && <AchievementsScreen />}
            {screen.name === 'settings' && <SettingsScreen />}
            {screen.name === 'parent' && <ParentScreen />}
          </motion.div>
        </AnimatePresence>
      </main>
      {!playing && <BottomNav />}
      <TreasureChestHost suppressed={playing} />
    </div>
  );
}
