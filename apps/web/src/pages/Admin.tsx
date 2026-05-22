import { useEffect, useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore, THEMES } from '../lib/theme';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';
const TOKEN_KEY = 'rihla.adminToken';

// Apple system font stack — renders as SF Pro on macOS/iOS
const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif';

// Apple HIG-inspired color tokens (light mode admin)
const C = {
  bg:       '#F5F5F7',
  surface:  '#FFFFFF',
  sidebar:  'rgba(255,255,255,0.88)',
  text:     '#1D1D1F',
  muted:    '#6E6E73',
  faint:    '#AEAEB2',
  accent:   '#007AFF',
  accentBg: 'rgba(0,122,255,0.09)',
  green:    '#34C759',
  orange:   '#FF9500',
  purple:   '#5E5CE6',
  red:      '#FF3B30',
  sep:      'rgba(0,0,0,0.07)',
  shadow:   '0 1px 3px rgba(0,0,0,0.05), 0 4px 20px rgba(0,0,0,0.07)',
  shadowLg: '0 2px 8px rgba(0,0,0,0.08), 0 16px 48px rgba(0,0,0,0.1)',
} as const;

interface Metrics {
  funnel: {
    sessions: number;
    consented: number;
    profiled: number;
    itineraries: number;
    consentRate: number;
    proposalRate: number;
  };
  archetypes: { key: string | null; count: number }[];
  budgetTiers: { key: string | null; count: number }[];
  topDestinations: { destination: string; count: number }[];
}

type Section = 'overview' | 'archetypes' | 'budget' | 'destinations' | 'export' | 'appearance';

const NAV: { id: Section; label: string; d: string }[] = [
  {
    id: 'overview', label: 'Overview',
    d: 'M3 4a1 1 0 011-1h5a1 1 0 011 1v5a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm9 0a1 1 0 011-1h5a1 1 0 011 1v5a1 1 0 01-1 1h-5a1 1 0 01-1-1V4zM3 13a1 1 0 011-1h5a1 1 0 011 1v5a1 1 0 01-1 1H4a1 1 0 01-1-1v-5zm9 0a1 1 0 011-1h5a1 1 0 011 1v5a1 1 0 01-1 1h-5a1 1 0 01-1-1v-5z',
  },
  {
    id: 'archetypes', label: 'Archetypes',
    d: 'M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z',
  },
  {
    id: 'budget', label: 'Budget',
    d: 'M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z',
  },
  {
    id: 'destinations', label: 'Destinations',
    d: 'M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z',
  },
  {
    id: 'export', label: 'Export',
    d: 'M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 9.293a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z',
  },
  {
    id: 'appearance', label: 'Appearance',
    d: 'M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4zm3 3a1 1 0 011 1v1h4V6a1 1 0 112 0v1h1a1 1 0 110 2h-1v4h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1H8v1a1 1 0 11-2 0v-1H5a1 1 0 110-2h1V9H5a1 1 0 010-2h1V6a1 1 0 011-1zm1 4v4h4V9H8z',
  },
];

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

// ── Login ──────────────────────────────────────────────────────────────────

function LoginForm({ onSubmit, error }: { onSubmit: (e: FormEvent) => void; error: string | null }) {
  return (
    <div style={{ minHeight: '100dvh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SF, padding: 24 }}>
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        style={{ background: C.surface, borderRadius: 20, padding: '40px 36px', width: '100%', maxWidth: 360, boxShadow: C.shadowLg }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 18,
            background: 'linear-gradient(145deg, #1a1a2e, #16213e)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(0,0,0,0.22)',
          }}>
            <span style={{ fontSize: 28, fontFamily: '"Playfair Display", serif', color: '#d4a853' }}>ر</span>
          </div>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, textAlign: 'center', marginBottom: 6, letterSpacing: '-0.03em' }}>
          Admin Access
        </h1>
        <p style={{ fontSize: 14, color: C.muted, textAlign: 'center', marginBottom: 28 }}>
          Enter your admin token to continue
        </p>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            name="token"
            type="password"
            autoComplete="off"
            autoFocus
            placeholder="Admin token"
            style={{
              width: '100%', padding: '12px 14px', borderRadius: 10, fontSize: 15,
              border: `1.5px solid ${error ? C.red : 'rgba(0,0,0,0.12)'}`,
              background: '#FAFAFA', color: C.text, fontFamily: SF,
              outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s',
            }}
          />
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ fontSize: 13, color: C.red, textAlign: 'center', margin: 0 }}
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
          <button
            type="submit"
            style={{
              padding: '12px', borderRadius: 10, fontSize: 15, fontWeight: 600,
              background: C.accent, color: '#fff', border: 'none', cursor: 'pointer',
              fontFamily: SF, letterSpacing: '-0.01em', marginTop: 2,
            }}
          >
            Continue
          </button>
        </form>

        <p style={{ fontSize: 12, color: C.faint, textAlign: 'center', marginTop: 20 }}>
          Rihla · Admin Console
        </p>
      </motion.div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────

export default function Admin() {
  const [token, setToken] = useState<string>(() => localStorage.getItem(TOKEN_KEY) ?? '');
  const [authed, setAuthed] = useState(false);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<Section>('overview');
  const [exportSessionId, setExportSessionId] = useState('');
  const [exportResult, setExportResult] = useState<string | null>(null);
  const [exportOk, setExportOk] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/admin/metrics`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        if (!r.ok) throw new Error(r.status === 401 ? 'Invalid token' : `HTTP ${r.status}`);
        return r.json() as Promise<Metrics>;
      })
      .then((m) => { setMetrics(m); setAuthed(true); setError(null); localStorage.setItem(TOKEN_KEY, token); })
      .catch((e: Error) => { setError(e.message); setAuthed(false); });
  }, [token]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const val = ((new FormData(e.currentTarget as HTMLFormElement).get('token') as string) ?? '').trim();
    setToken(val);
  }

  async function onExport(e: FormEvent) {
    e.preventDefault();
    setExportResult(null);
    try {
      const r = await fetch(`${API_BASE}/admin/segments/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sessionId: exportSessionId.trim() }),
      });
      const data = await r.json();
      const ok = r.ok;
      setExportOk(ok);
      setExportResult(ok ? `Exported ${data.segments?.length ?? 0} segments successfully` : (data.error ?? 'Export failed'));
    } catch (err) {
      setExportOk(false);
      setExportResult((err as Error).message);
    }
  }

  if (!authed) return <LoginForm onSubmit={onSubmit} error={error} />;

  const currentNav = NAV.find((n) => n.id === section);

  return (
    <div style={{ background: C.bg, minHeight: '100dvh', fontFamily: SF }}>
      {/* ── Toolbar ────────────────────────────────────────────────── */}
      <header style={{
        background: C.sidebar,
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        borderBottom: `1px solid ${C.sep}`,
        height: 52,
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(145deg, #1a1a2e, #16213e)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 14, fontFamily: '"Playfair Display", serif', color: '#d4a853' }}>ر</span>
          </div>
          <span style={{ fontSize: 15, fontWeight: 600, color: C.text, letterSpacing: '-0.02em' }}>Rihla</span>
          <span style={{ fontSize: 13, color: C.faint, margin: '0 2px' }}>/</span>
          <span style={{ fontSize: 13, color: C.muted }}>{currentNav?.label}</span>
        </div>
        <button
          onClick={() => { localStorage.removeItem(TOKEN_KEY); setToken(''); setAuthed(false); }}
          style={{ fontSize: 13, color: C.accent, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6, fontFamily: SF }}
        >
          Sign Out
        </button>
      </header>

      {/* ── Body ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', minHeight: 'calc(100dvh - 52px)' }}>

        {/* Sidebar — desktop */}
        <aside
          className="hidden md:block"
          style={{
            width: 220, flexShrink: 0,
            background: C.sidebar,
            backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
            borderRight: `1px solid ${C.sep}`,
            position: 'sticky', top: 52,
            height: 'calc(100dvh - 52px)', overflowY: 'auto',
          }}
        >
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '16px 10px' }}>
            {NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '9px 10px', borderRadius: 8, border: 'none',
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                  background: section === item.id ? C.accentBg : 'transparent',
                  color: section === item.id ? C.accent : C.text,
                  fontSize: 14, fontWeight: section === item.id ? 500 : 400,
                  fontFamily: SF, transition: 'background 0.12s, color 0.12s',
                }}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" width={16} height={16} style={{ flexShrink: 0, opacity: section === item.id ? 1 : 0.55 }}>
                  <path fillRule="evenodd" d={item.d} clipRule="evenodd" />
                </svg>
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main style={{ flex: 1 }}>
          <div className="p-5 pb-24 md:p-8 md:pb-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={section}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                {section === 'overview'     && metrics && <OverviewSection m={metrics} />}
                {section === 'archetypes'   && metrics && <DistSection title="Archetypes"   subtitle={`${metrics.archetypes.length} traveler archetypes`}   rows={metrics.archetypes}   color={C.purple} />}
                {section === 'budget'       && metrics && <DistSection title="Budget Tiers" subtitle="Spending preferences across sessions"                  rows={metrics.budgetTiers}  color={C.orange} />}
                {section === 'destinations' && metrics && <DestSection rows={metrics.topDestinations} />}
                {section === 'export'       && <ExportSection onExport={onExport} value={exportSessionId} onChange={setExportSessionId} result={exportResult} ok={exportOk} />}
                {section === 'appearance'   && <AppearanceSection />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* ── Mobile tab bar ─────────────────────────────────────────── */}
      <div
        className="md:hidden"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
          background: C.sidebar,
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderTop: `1px solid ${C.sep}`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-around', padding: `6px 0 calc(6px + env(safe-area-inset-bottom))` }}>
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                background: 'none', border: 'none', cursor: 'pointer',
                color: section === item.id ? C.accent : C.faint,
                fontSize: 10, fontFamily: SF, padding: '4px 8px',
              }}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" width={22} height={22}>
                <path fillRule="evenodd" d={item.d} clipRule="evenodd" />
              </svg>
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Overview ───────────────────────────────────────────────────────────────

function OverviewSection({ m }: { m: Metrics }) {
  const tiles = [
    { label: 'Sessions',    value: m.funnel.sessions,    color: C.accent,  sub: 'total visits' },
    { label: 'Consented',   value: m.funnel.consented,   color: C.green,   sub: `${pct(m.funnel.consentRate)} consent rate` },
    { label: 'Profiles',    value: m.funnel.profiled,    color: C.purple,  sub: 'fully profiled' },
    { label: 'Itineraries', value: m.funnel.itineraries, color: C.orange,  sub: `${pct(m.funnel.proposalRate)} conversion` },
  ];

  const funnel = [
    { label: 'Sessions',    n: m.funnel.sessions,    color: C.accent,  ratio: 1 },
    { label: 'Consented',   n: m.funnel.consented,   color: C.green,   ratio: m.funnel.sessions ? m.funnel.consented / m.funnel.sessions : 0 },
    { label: 'Profiles',    n: m.funnel.profiled,    color: C.purple,  ratio: m.funnel.sessions ? m.funnel.profiled / m.funnel.sessions : 0 },
    { label: 'Itineraries', n: m.funnel.itineraries, color: C.orange,  ratio: m.funnel.sessions ? m.funnel.itineraries / m.funnel.sessions : 0 },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHeader title="Overview" subtitle="Funnel performance at a glance" />

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((tile, i) => (
          <motion.div
            key={tile.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.06 }}
            style={{ background: C.surface, borderRadius: 16, padding: '20px 20px 18px', boxShadow: C.shadow }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: tile.color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              {tile.label}
            </div>
            <div style={{ fontSize: 40, fontWeight: 700, color: C.text, letterSpacing: '-0.04em', lineHeight: 1 }}>
              {tile.value.toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>{tile.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Funnel */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.28 }}
        style={{ background: C.surface, borderRadius: 16, padding: 24, boxShadow: C.shadow }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 20, letterSpacing: '-0.01em' }}>
          Conversion Funnel
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {funnel.map((step, i) => (
            <div key={step.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
                <span style={{ fontSize: 13, color: C.muted }}>{step.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{step.n.toLocaleString()}</span>
                  {i > 0 && (
                    <span style={{ fontSize: 11, color: step.color, fontWeight: 500 }}>{pct(step.ratio)}</span>
                  )}
                </div>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${step.ratio * 100}%` }}
                  transition={{ duration: 0.85, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                  style={{ height: '100%', borderRadius: 4, background: step.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ── Distribution ───────────────────────────────────────────────────────────

function DistSection({
  title, subtitle, rows, color,
}: {
  title: string;
  subtitle: string;
  rows: { key: string | null; count: number }[];
  color: string;
}) {
  const total = rows.reduce((s, r) => s + r.count, 0) || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHeader title={title} subtitle={subtitle} />
      <div style={{ background: C.surface, borderRadius: 16, overflow: 'hidden', boxShadow: C.shadow }}>
        {rows.length === 0 ? (
          <EmptyState />
        ) : (
          rows.map((r, i) => (
            <div
              key={r.key ?? '∅'}
              style={{ padding: '14px 20px', borderTop: i > 0 ? `1px solid ${C.sep}` : 'none' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 14, color: C.text, textTransform: 'capitalize' }}>
                  {r.key ?? 'Unknown'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12, color: C.muted }}>{pct(r.count / total)}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.text, minWidth: 28, textAlign: 'right' }}>{r.count}</span>
                </div>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(r.count / total) * 100}%` }}
                  transition={{ duration: 0.75, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  style={{ height: '100%', borderRadius: 3, background: color }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Destinations ───────────────────────────────────────────────────────────

function DestSection({ rows }: { rows: { destination: string; count: number }[] }) {
  const max = rows[0]?.count ?? 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHeader title="Destinations" subtitle="Most requested destinations by session count" />
      <div style={{ background: C.surface, borderRadius: 16, overflow: 'hidden', boxShadow: C.shadow }}>
        {rows.length === 0 ? (
          <EmptyState />
        ) : (
          rows.map((d, i) => (
            <div
              key={d.destination}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 20px', borderTop: i > 0 ? `1px solid ${C.sep}` : 'none' }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: C.faint, minWidth: 22, textAlign: 'right' }}>
                {i + 1}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <span style={{ fontSize: 14, color: C.text }}>{d.destination}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>{d.count.toLocaleString()}</span>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(d.count / max) * 100}%` }}
                    transition={{ duration: 0.75, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                    style={{ height: '100%', borderRadius: 3, background: C.accent }}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Export ─────────────────────────────────────────────────────────────────

function ExportSection({
  onExport, value, onChange, result, ok,
}: {
  onExport: (e: FormEvent) => void;
  value: string;
  onChange: (v: string) => void;
  result: string | null;
  ok: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 520 }}>
      <SectionHeader title="Export" subtitle="Snapshot ad segments for a session" />

      <div style={{ background: C.surface, borderRadius: 16, padding: 24, boxShadow: C.shadow }}>
        <form onSubmit={onExport} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.muted, marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Session UUID
            </label>
            <input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 13,
                border: `1.5px solid rgba(0,0,0,0.12)`, background: '#FAFAFA',
                color: C.text, fontFamily: 'ui-monospace, "SF Mono", "Menlo", monospace',
                outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = C.accent; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.12)'; }}
            />
          </div>

          <button
            type="submit"
            style={{
              padding: '11px 22px', borderRadius: 10, fontSize: 14, fontWeight: 600,
              background: C.accent, color: '#fff', border: 'none', cursor: 'pointer',
              fontFamily: SF, alignSelf: 'flex-start', letterSpacing: '-0.01em',
            }}
          >
            Snapshot Segments
          </button>
        </form>

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                marginTop: 16, padding: '12px 14px', borderRadius: 10, fontSize: 13,
                background: ok ? 'rgba(52,199,89,0.1)' : 'rgba(255,59,48,0.08)',
                color: ok ? '#1A7F37' : '#C0392B',
              }}
            >
              {result}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ background: C.surface, borderRadius: 16, padding: 20, boxShadow: C.shadow }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
          About this tool
        </div>
        <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.65 }}>
          Snapshots the inferred ad-targeting segments (archetype, budget tier, destination clusters, personality dimensions) for a given session into the{' '}
          <code style={{ fontFamily: 'ui-monospace, "SF Mono", monospace', background: 'rgba(0,0,0,0.05)', padding: '1px 5px', borderRadius: 4 }}>
            AdSegmentsExport
          </code>{' '}
          table, suitable for syncing to ad platforms.
        </p>
      </div>
    </div>
  );
}

// ── Shared ─────────────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: C.text, letterSpacing: '-0.03em', marginBottom: 3 }}>
        {title}
      </h1>
      {subtitle && <p style={{ fontSize: 14, color: C.muted }}>{subtitle}</p>}
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ padding: '48px 24px', textAlign: 'center', color: C.faint, fontSize: 14 }}>
      No data yet
    </div>
  );
}

// ── Appearance ─────────────────────────────────────────────────────────────

function AppearanceSection() {
  const { theme, setTheme } = useThemeStore();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHeader
        title="Appearance"
        subtitle="Global theme — changes take effect immediately across all pages"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {THEMES.map((t) => {
          const isActive = theme === t.id;
          return (
            <motion.button
              key={t.id}
              onClick={() => setTheme(t.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'relative',
                background: t.preview.bg,
                borderRadius: t.preview.radius,
                padding: '20px',
                cursor: 'pointer',
                textAlign: 'left',
                border: 'none',
                boxShadow: isActive
                  ? `0 0 0 2px ${C.accent}, 0 4px 20px rgba(0,0,0,0.18)`
                  : '0 2px 8px rgba(0,0,0,0.12)',
                transition: 'box-shadow 0.2s',
                width: '100%',
              }}
            >
              {/* Active checkmark */}
              {isActive && (
                <div style={{
                  position: 'absolute', top: 10, right: 10,
                  width: 22, height: 22, borderRadius: '50%',
                  background: C.accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg viewBox="0 0 12 12" fill="none" width={12} height={12}>
                    <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}

              {/* Accent gradient bar */}
              <div style={{
                height: 4,
                background: t.preview.accent,
                borderRadius: 2,
                marginBottom: 16,
              }} />

              {/* Mini mockup */}
              <div style={{
                background: t.preview.surface,
                padding: '12px',
                borderRadius: `calc(${t.preview.radius} * 0.6)`,
                border: `1px solid ${t.preview.text}1a`,
                marginBottom: 14,
              }}>
                <div style={{
                  height: 8,
                  background: t.preview.text,
                  opacity: 0.8,
                  borderRadius: 3,
                  marginBottom: 6,
                  width: '70%',
                }} />
                <div style={{
                  height: 6,
                  background: t.preview.text,
                  opacity: 0.35,
                  borderRadius: 3,
                  width: '50%',
                }} />
              </div>

              {/* Theme name */}
              <div style={{
                fontFamily: t.preview.font,
                color: t.preview.text,
                fontWeight: 700,
                fontSize: 15,
                marginBottom: 4,
                letterSpacing: '-0.01em',
              }}>
                {t.name}
              </div>

              {/* Description */}
              <div style={{
                color: t.preview.muted,
                fontSize: 12,
                lineHeight: 1.4,
              }}>
                {t.description}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
