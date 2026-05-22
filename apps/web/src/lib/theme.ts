import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'midnight' | 'evergreen' | 'horizon' | 'ember' | 'obsidian';

export interface ThemeMeta {
  id: Theme;
  name: string;
  description: string;
  preview: {
    bg: string;        // hex background
    surface: string;   // surface color
    accent: string;    // CSS gradient string
    text: string;      // text color
    muted: string;     // muted text color
    radius: string;    // border-radius for preview card itself
    font: string;      // font-family CSS string for preview label
  };
}

export const THEMES: ThemeMeta[] = [
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Dark luxury — gold on deep indigo',
    preview: {
      bg: '#1a1a2e',
      surface: 'rgba(255,255,255,0.05)',
      accent: 'linear-gradient(135deg, #d4a853, #e2b97e)',
      text: '#f0ece4',
      muted: '#8b8374',
      radius: '12px',
      font: '"Playfair Display", Georgia, serif',
    },
  },
  {
    id: 'evergreen',
    name: 'Grand Maison',
    description: 'Forest dark — champagne on deep canopy',
    preview: {
      bg: '#0a2416',
      surface: 'rgba(255,255,255,0.05)',
      accent: 'linear-gradient(135deg, #c9a84c, #d4a853)',
      text: '#f5ede0',
      muted: '#7d8c7a',
      radius: '12px',
      font: '"Playfair Display", Georgia, serif',
    },
  },
  {
    id: 'horizon',
    name: 'Horizon',
    description: 'Light clean modern — sky blue on white',
    preview: {
      bg: '#F8FAFC',
      surface: 'rgba(255,255,255,0.95)',
      accent: 'linear-gradient(135deg, #0EA5E9, #38BDF8)',
      text: '#0F172A',
      muted: '#64748B',
      radius: '10px',
      font: '"Inter", system-ui, sans-serif',
    },
  },
  {
    id: 'ember',
    name: 'Ember',
    description: 'Warm terracotta dark — fire on charcoal',
    preview: {
      bg: '#1C1410',
      surface: 'rgba(255,180,100,0.06)',
      accent: 'linear-gradient(135deg, #E8703A, #D6A550)',
      text: '#F5EDE0',
      muted: '#A88E76',
      radius: '24px',
      font: '"Cormorant Garamond", Georgia, serif',
    },
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    description: 'Pure minimal stark — electric orange on black',
    preview: {
      bg: '#000000',
      surface: 'rgba(255,255,255,0.03)',
      accent: 'linear-gradient(135deg, #FF4D00, #FF7A00)',
      text: '#F2F2F2',
      muted: '#787878',
      radius: '3px',
      font: '"Space Grotesk", system-ui, sans-serif',
    },
  },
];

const THEME_ORDER: Theme[] = ['midnight', 'evergreen', 'horizon', 'ember', 'obsidian'];

interface ThemeStore {
  theme: Theme;
  setTheme: (t: Theme) => void;
  nextTheme: () => void;
}

function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'midnight',
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      nextTheme: () => {
        const current = get().theme;
        const idx = THEME_ORDER.indexOf(current);
        const next = THEME_ORDER[(idx + 1) % THEME_ORDER.length];
        applyTheme(next);
        set({ theme: next });
      },
    }),
    { name: 'rihla-theme' }
  )
);

export function initTheme(): void {
  applyTheme(useThemeStore.getState().theme);
}
