import { useThemeStore, THEMES } from '../../lib/theme';

export default function ThemeSwitcher() {
  const { theme, nextTheme } = useThemeStore();
  const meta = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  return (
    <button
      onClick={nextTheme}
      className="text-rihla-muted hover:text-rihla-text text-xs uppercase tracking-widest transition flex items-center gap-1.5"
      aria-label="Switch theme"
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: meta.preview.accent }}
      />
      {meta.name}
    </button>
  );
}
