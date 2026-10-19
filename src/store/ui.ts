import { create } from 'zustand';
import type { WorldId } from '../content/worlds';

export type Screen =
  | { name: 'splash' }
  | { name: 'home' }
  | { name: 'map' }
  | { name: 'world'; worldId: WorldId }
  | { name: 'play'; levelId: string }
  | { name: 'review' }
  | { name: 'rewards' }
  | { name: 'collection' }
  | { name: 'achievements' }
  | { name: 'settings' }
  | { name: 'parent' };

interface UiState {
  screen: Screen;
  go: (screen: Screen) => void;
}

export const useUi = create<UiState>((set) => ({
  screen: { name: 'splash' },
  go: (screen) => {
    set({ screen });
    window.scrollTo({ top: 0 });
  },
}));
