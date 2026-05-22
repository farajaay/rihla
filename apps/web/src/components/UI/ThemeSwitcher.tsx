import { useThemeStore } from '../../lib/theme';

const LABELS = {
  midnight: 'Grand Maison',
  evergreen: 'Midnight',
} as const;

export default function ThemeSwitcher() {
  const { theme, setTheme } = useThemeStore();
  const next = theme === 'midnight' ? 'evergreen' : 'midnight';

  return (
    <button
      onClick={() => setTheme(next)}
      className="text-rihla-muted hover:text-rihla-text text-xs uppercase tracking-widest transition flex items-center gap-1.5"
      aria-label="Switch theme"
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{
          background: theme === 'midnight'
            ? 'linear-gradient(135deg, #1a6b3a, #2d8a50)'
            : 'linear-gradient(135deg, #16213e, #1a1a2e)',
        }}
      />
      {LABELS[theme]}
    </button>
  );
}
