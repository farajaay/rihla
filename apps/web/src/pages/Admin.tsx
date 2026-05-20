import { useEffect, useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';
const TOKEN_KEY = 'rihla.adminToken';

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

export default function Admin() {
  const [token, setToken] = useState<string>(() => localStorage.getItem(TOKEN_KEY) ?? '');
  const [authed, setAuthed] = useState(false);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportSessionId, setExportSessionId] = useState('');
  const [exportResult, setExportResult] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/admin/metrics`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        if (!r.ok) throw new Error(r.status === 401 ? 'Invalid token' : `HTTP ${r.status}`);
        return r.json() as Promise<Metrics>;
      })
      .then((m) => {
        setMetrics(m);
        setAuthed(true);
        setError(null);
        localStorage.setItem(TOKEN_KEY, token);
      })
      .catch((e: Error) => {
        setError(e.message);
        setAuthed(false);
      });
  }, [token]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const value = (new FormData(e.currentTarget as HTMLFormElement).get('token') as string ?? '').trim();
    setToken(value);
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
      setExportResult(r.ok ? `Exported ${data.segments?.length ?? 0} segments` : data.error ?? 'Failed');
    } catch (err) {
      setExportResult((err as Error).message);
    }
  }

  if (!authed) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-6">
        <form onSubmit={onSubmit} className="glass rounded-2xl p-8 w-full max-w-sm space-y-4">
          <h1 className="font-display text-2xl text-rihla-text">Admin</h1>
          <p className="text-rihla-muted text-sm">Enter the admin token.</p>
          <input
            name="token"
            type="password"
            defaultValue={token}
            autoComplete="off"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-rihla-text"
            placeholder="ADMIN_TOKEN"
          />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button type="submit" className="w-full bg-rihla-gold/90 hover:bg-rihla-gold text-rihla-primary font-medium rounded-lg py-2 transition">
            Unlock
          </button>
        </form>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-dvh p-6 md:p-10 max-w-6xl mx-auto space-y-8"
    >
      <header className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-rihla-text">Rihla · Admin</h1>
        <button
          onClick={() => {
            localStorage.removeItem(TOKEN_KEY);
            setToken('');
            setAuthed(false);
          }}
          className="text-rihla-muted text-sm hover:text-rihla-text"
        >
          Sign out
        </button>
      </header>

      {metrics && (
        <>
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Tile label="Sessions" value={metrics.funnel.sessions} />
            <Tile label="Consented" value={metrics.funnel.consented} sub={`${(metrics.funnel.consentRate * 100).toFixed(1)}%`} />
            <Tile label="Profiles" value={metrics.funnel.profiled} />
            <Tile label="Itineraries" value={metrics.funnel.itineraries} sub={`${(metrics.funnel.proposalRate * 100).toFixed(1)}% conv.`} />
          </section>

          <section className="grid md:grid-cols-2 gap-6">
            <DistributionCard title="Archetypes" rows={metrics.archetypes} />
            <DistributionCard title="Budget Tiers" rows={metrics.budgetTiers} />
          </section>

          <section className="glass rounded-2xl p-6">
            <h2 className="font-display text-xl text-rihla-text mb-4">Top destinations</h2>
            <div className="space-y-2">
              {metrics.topDestinations.length === 0 && <p className="text-rihla-muted text-sm">No data yet.</p>}
              {metrics.topDestinations.map((d) => (
                <div key={d.destination} className="flex justify-between text-sm">
                  <span className="text-rihla-text">{d.destination}</span>
                  <span className="text-rihla-muted">{d.count}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="glass rounded-2xl p-6">
            <h2 className="font-display text-xl text-rihla-text mb-4">Export ad segments</h2>
            <form onSubmit={onExport} className="flex flex-col sm:flex-row gap-3">
              <input
                value={exportSessionId}
                onChange={(e) => setExportSessionId(e.target.value)}
                placeholder="session UUID"
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-rihla-text text-sm"
              />
              <button type="submit" className="bg-rihla-gold/90 hover:bg-rihla-gold text-rihla-primary font-medium rounded-lg px-4 py-2 transition">
                Snapshot
              </button>
            </form>
            {exportResult && <p className="text-rihla-muted text-sm mt-3">{exportResult}</p>}
          </section>
        </>
      )}
    </motion.div>
  );
}

function Tile({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <p className="text-rihla-muted text-xs uppercase tracking-widest mb-2">{label}</p>
      <p className="font-display text-3xl text-rihla-text">{value.toLocaleString()}</p>
      {sub && <p className="text-rihla-muted text-xs mt-1">{sub}</p>}
    </div>
  );
}

function DistributionCard({ title, rows }: { title: string; rows: { key: string | null; count: number }[] }) {
  const total = rows.reduce((sum, r) => sum + r.count, 0) || 1;
  return (
    <div className="glass rounded-2xl p-6">
      <h2 className="font-display text-xl text-rihla-text mb-4">{title}</h2>
      <div className="space-y-3">
        {rows.length === 0 && <p className="text-rihla-muted text-sm">No data yet.</p>}
        {rows.map((r) => (
          <div key={r.key ?? '∅'}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-rihla-text capitalize">{r.key ?? 'unknown'}</span>
              <span className="text-rihla-muted">{r.count}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${(r.count / total) * 100}%`, background: 'linear-gradient(90deg, #d4a853, #e2b97e)' }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
