import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'midnight' | 'evergreen';

interface ThemeStore {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'midnight',
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
    }),
    { name: 'rihla-theme' }
  )
);

export function initTheme(): void {
  applyTheme(useThemeStore.getState().theme);
}
