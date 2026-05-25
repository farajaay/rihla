import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useItinerary, type ItineraryActivity, type ItineraryDay } from '../hooks/useItinerary';
// AnimatePresence kept for refining overlay
import RefinementBar from '../components/Itinerary/RefinementBar';
import { useT, type StringKey } from '../lib/i18n';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

const ACTIVITY_COLORS: Record<string, string> = {
  sightseeing: 'bg-blue-500/20 text-blue-300',
  dining:      'bg-amber-500/20 text-amber-300',
  transport:   'bg-slate-500/20 text-slate-300',
  leisure:     'bg-teal-500/20 text-teal-300',
  activity:    'bg-orange-500/20 text-orange-300',
  cultural:    'bg-purple-500/20 text-purple-300',
  shopping:    'bg-pink-500/20 text-pink-300',
};

const BUDGET_KEYS: Record<string, StringKey> = {
  lean: 'budget.lean',
  balanced: 'budget.balanced',
  premium: 'budget.premium',
  ultra: 'budget.ultra',
};

function formatSAR(n: number): string {
  return new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(n);
}

function ActivityCard({ slotKey, activity }: { slotKey: StringKey; activity: ItineraryActivity }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const colorClass = ACTIVITY_COLORS[activity.type] ?? 'bg-white/10 text-white/60';

  return (
    <div className="border border-white/5 rounded-xl overflow-hidden activity-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex-shrink-0 mt-0.5">
          <span className="text-rihla-muted text-xs uppercase tracking-widest font-medium w-16 inline-block">{t(slotKey)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-rihla-text text-sm font-medium">{activity.title}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${colorClass}`}>
              {activity.type}
            </span>
          </div>
          <p className="text-rihla-muted text-xs mt-0.5">{activity.duration}</p>
        </div>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-4 h-4 text-rihla-muted flex-shrink-0 transition-transform mt-1 print:hidden ${open ? 'rotate-180' : ''}`}
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Always rendered — height controlled via CSS for print compatibility */}
      <div className={`activity-detail overflow-hidden transition-[max-height] duration-200 ease-out ${open ? 'max-h-96' : 'max-h-0'}`}>
        <div className="px-4 pb-4 pl-[4.25rem] space-y-2">
          <p className="text-rihla-text/80 text-sm leading-relaxed">{activity.description}</p>
          {activity.tip && (
            <div className="flex items-start gap-2 bg-rihla-gold/10 border border-rihla-gold/20 rounded-lg p-3">
              <span className="text-rihla-gold text-xs mt-0.5">✦</span>
              <p className="text-rihla-accent text-xs leading-relaxed">{activity.tip}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DayCard({ day, index }: { day: ItineraryDay; index: number }) {
  const t = useT();
  const [open, setOpen] = useState(index === 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 + index * 0.08 }}
      className="day-card border border-white/8 rounded-2xl bg-rihla-secondary/40"
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-white/5 transition-colors print:pointer-events-none"
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-display font-bold text-sm day-number"
          style={{ background: 'var(--rihla-brand-gradient)', color: 'var(--rihla-on-gold)' }}
        >
          {day.day}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-rihla-text font-medium text-sm">{day.title}</p>
          <p className="text-rihla-muted text-xs capitalize">{day.theme}</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-rihla-accent text-xs">{formatSAR(day.estimated_cost_sar)}</p>
          <p className="text-rihla-muted text-[10px]">{t('itinerary.estCost')}</p>
        </div>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-4 h-4 text-rihla-muted flex-shrink-0 transition-transform print:hidden ${open ? 'rotate-180' : ''}`}
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Always rendered — height controlled via CSS for print compatibility */}
      <div className={`day-content overflow-hidden transition-[max-height] duration-250 ease-out ${open ? 'max-h-[3000px]' : 'max-h-0'}`}>
        <div className="px-5 pb-5 space-y-2">
          <ActivityCard slotKey="itinerary.morning" activity={day.morning} />
          <ActivityCard slotKey="itinerary.afternoon" activity={day.afternoon} />
          <ActivityCard slotKey="itinerary.evening" activity={day.evening} />
          <div className="flex items-center gap-2 pt-2 border-t border-white/5">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-rihla-gold flex-shrink-0">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            <p className="text-rihla-muted text-xs">{day.accommodation}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SkeletonLoader() {
  const t = useT();
  return (
    <div className="min-h-dvh bg-rihla-primary text-rihla-text flex items-center justify-center">
      <div className="text-center space-y-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 mx-auto rounded-full border-2 border-rihla-gold/40 border-t-rihla-gold"
        />
        <p className="text-rihla-muted text-sm">{t('itinerary.loading')}</p>
      </div>
    </div>
  );
}

export default function Itinerary() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, meta, loading, error } = useItinerary(id ?? '');
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);

  async function handleRefine(request: string) {
    if (!id) return;
    setRefining(true);
    setRefineError(null);
    try {
      const res = await fetch(`${API_BASE}/itineraries/${id}/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = (await res.json()) as { id: string };
      navigate(`/itinerary/${result.id}`);
    } catch (err) {
      setRefineError((err as Error).message);
      setRefining(false);
    }
  }

  if (loading) return <SkeletonLoader />;

  if (error || !data) {
    return (
      <div className="min-h-dvh bg-rihla-primary text-rihla-text flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-rihla-text">{error ?? t('itinerary.notFound')}</p>
          <button
            onClick={() => navigate('/chat')}
            className="text-rihla-accent text-sm hover:text-rihla-gold transition-colors"
          >
            {t('itinerary.back')}
          </button>
        </div>
      </div>
    );
  }

  const budgetKey = BUDGET_KEYS[data.budget_tier];
  const budgetLabel = budgetKey ? t(budgetKey) : data.budget_tier;

  const practicalInfoRows = [
    { labelKey: 'info.bestTime' as StringKey, value: data.practical_info.best_time_to_visit },
    { labelKey: 'info.visa' as StringKey, value: data.practical_info.visa_info },
    { labelKey: 'info.currency' as StringKey, value: data.practical_info.currency },
    { labelKey: 'info.language' as StringKey, value: data.practical_info.language },
    { labelKey: 'info.gettingThere' as StringKey, value: data.practical_info.flight_info },
  ];

  return (
    <>
      <style>{`
        @media print {
          @page {
            margin: 18mm 15mm 18mm 15mm;
            size: A4;
          }

          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

          body {
            background: #ffffff !important;
            color: #111111 !important;
            font-family: 'Georgia', 'Times New Roman', serif;
            font-size: 10.5pt;
            line-height: 1.65;
          }

          /* ── Hide UI chrome ── */
          .no-print { display: none !important; }

          /* ── Override CSS variables for light print ── */
          :root {
            --rihla-text: #111111;
            --rihla-muted: #555555;
            --rihla-accent: #8B6C30;
            --rihla-gold: #C49A28;
            --rihla-primary: #ffffff;
            --rihla-secondary: #f8f8f8;
          }

          /* ── Hero → clean document header ── */
          [style*="rihla-hero-gradient"] {
            background: #ffffff !important;
            padding-top: 0 !important;
            padding-bottom: 16pt !important;
            border-bottom: 2px solid #C49A28 !important;
          }

          /* ── Title gradient → solid dark ── */
          h1 {
            -webkit-text-fill-color: #1a1a1a !important;
            background: none !important;
            font-size: 22pt !important;
            line-height: 1.25 !important;
            margin-bottom: 6pt !important;
          }

          /* ── Tagline ── */
          [class*="text-rihla-text/70"] { color: #444 !important; font-size: 11pt !important; }

          /* ── Meta pills → lighter treatment ── */
          [class*="bg-white/5"], [class*="border-white/10"] {
            background: #f5f5f5 !important;
            border-color: #ddd !important;
          }

          /* ── Glass surfaces → white ── */
          .glass {
            background: #f9f9f9 !important;
            backdrop-filter: none !important;
            border: 1px solid #e0e0e0 !important;
          }

          /* ── Section headings ── */
          h2 { color: #888 !important; font-size: 7pt !important; letter-spacing: 0.12em !important; }

          /* ── Highlight tags ── */
          [class*="bg-rihla-gold/10"] {
            background: #FFF8E0 !important;
            border-color: #D4A853 !important;
          }
          [class*="text-rihla-accent"] { color: #8B6C30 !important; }
          [class*="text-rihla-gold"] { color: #C49A28 !important; }
          [class*="text-rihla-muted"] { color: #666 !important; }
          [class*="text-rihla-text"] { color: #111 !important; }

          /* ── Day cards ── */
          .day-card {
            background: #ffffff !important;
            border: 1.5px solid #e0e0e0 !important;
            border-radius: 8pt !important;
            page-break-inside: avoid !important;
            margin-bottom: 10pt !important;
          }

          /* ── Day number badge ── */
          .day-number { background: #C49A28 !important; color: #fff !important; }

          /* ── Force all collapsed content visible in print ── */
          .day-content, .activity-detail {
            max-height: none !important;
            overflow: visible !important;
          }

          /* ── Activity cards ── */
          .activity-card {
            border-color: #ebebeb !important;
            background: #fafafa !important;
          }

          /* ── Practical info cards ── */
          [class*="bg-rihla-secondary"] {
            background: #f8f8f8 !important;
            border-color: #e5e5e5 !important;
          }

          /* ── Personalization note ── */
          [style*="rgba(212,168,83"] {
            background: #FFF8E0 !important;
            border: 1px solid #D4A853 !important;
          }

          /* ── Page break after every 3 days (approx) ── */
          .day-card:nth-child(3n) { page-break-after: always !important; }
        }
      `}</style>

      <div className="min-h-dvh bg-rihla-primary text-rihla-text">
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <div
          className="relative px-6 pt-16 pb-12 md:pt-24 md:pb-16 print:pt-8 print:pb-8"
          style={{ background: 'var(--rihla-hero-gradient)' }}
        >
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center gap-3 mb-4 no-print">
                <p className="text-rihla-muted text-xs uppercase tracking-widest">
                  {t('itinerary.personalizedJourney')}
                </p>
                {meta && meta.revision > 1 && (
                  <span className="bg-rihla-gold/15 border border-rihla-gold/30 text-rihla-accent text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full">
                    v{meta.revision}
                  </span>
                )}
                {meta?.parentId && (
                  <Link
                    to={`/itinerary/${meta.parentId}`}
                    className="text-rihla-muted text-xs hover:text-rihla-text transition-colors"
                  >
                    {t('itinerary.prevVersion')}
                  </Link>
                )}
              </div>
              {meta?.refinementRequest && (
                <div
                  className="mb-6 px-4 py-2 rounded-lg text-xs text-rihla-muted no-print inline-flex items-center gap-2"
                  style={{ background: 'rgba(212,168,83,0.06)', border: '1px solid rgba(212,168,83,0.15)' }}
                >
                  <span className="text-rihla-gold">↻</span>
                  {t('itinerary.refinedFrom')} "{meta.refinementRequest}"
                </div>
              )}
              <h1
                className="font-display text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-4"
                style={{ background: 'var(--rihla-title-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
              >
                {data.title}
              </h1>
              <p className="text-rihla-text/70 text-lg md:text-xl leading-relaxed mb-8 max-w-2xl">
                {data.tagline}
              </p>

              <div className="flex flex-wrap gap-3">
                {[
                  { label: `${data.duration_days} days`, icon: '◷' },
                  { label: data.destination, icon: '◎' },
                  { label: budgetLabel, icon: '◈' },
                  { label: formatSAR(data.total_estimated_cost_sar), icon: '◆' },
                ].map(({ label, icon }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2"
                  >
                    <span className="text-rihla-gold text-xs">{icon}</span>
                    <span className="text-rihla-text text-sm">{label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-10 space-y-10">
          {/* ── Highlights ───────────────────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
          >
            <h2 className="text-xs uppercase tracking-widest text-rihla-muted mb-4 font-medium">
              {t('itinerary.highlights')}
            </h2>
            <div className="flex flex-wrap gap-2">
              {data.highlights.map((h, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.06 }}
                  className="flex items-center gap-1.5 bg-rihla-gold/10 border border-rihla-gold/25 rounded-full px-4 py-2 text-rihla-accent text-sm"
                >
                  <span className="text-rihla-gold text-xs">✦</span>
                  {h}
                </motion.span>
              ))}
            </div>
          </motion.section>

          {/* ── Day-by-day ───────────────────────────────────────── */}
          <section>
            <h2 className="text-xs uppercase tracking-widest text-rihla-muted mb-4 font-medium">
              {t('itinerary.dayByDay')}
            </h2>
            <div className="space-y-3">
              {data.days.map((day, i) => (
                <DayCard key={day.day} day={day} index={i} />
              ))}
            </div>
          </section>

          {/* ── Practical Info ───────────────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.6 + data.days.length * 0.08 }}
          >
            <h2 className="text-xs uppercase tracking-widest text-rihla-muted mb-4 font-medium">
              {t('itinerary.practicalInfo')}
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {practicalInfoRows.map(({ labelKey, value }) => (
                <div
                  key={labelKey}
                  className="bg-rihla-secondary/40 border border-white/8 rounded-xl p-4"
                >
                  <p className="text-rihla-muted text-[10px] uppercase tracking-widest mb-1">{t(labelKey)}</p>
                  <p className="text-rihla-text text-sm leading-relaxed">{value}</p>
                </div>
              ))}
              <div className="bg-rihla-secondary/40 border border-white/8 rounded-xl p-4 sm:col-span-1">
                <p className="text-rihla-muted text-[10px] uppercase tracking-widest mb-2">{t('info.tips')}</p>
                <ul className="space-y-1.5">
                  {data.practical_info.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-rihla-text/80">
                      <span className="text-rihla-gold mt-0.5 flex-shrink-0">·</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.section>

          {/* ── Personalization Note ─────────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.7 + data.days.length * 0.08 }}
          >
            <div
              className="rounded-2xl p-6"
              style={{ background: 'linear-gradient(135deg, rgba(212,168,83,0.08), rgba(226,185,126,0.04))', border: '1px solid rgba(212,168,83,0.2)' }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--rihla-brand-gradient)' }}
                >
                  <span className="text-rihla-primary font-bold text-sm font-display">ر</span>
                </div>
                <div>
                  <p className="text-rihla-accent text-xs uppercase tracking-widest mb-2 font-medium">
                    {t('itinerary.noteLabel')}
                  </p>
                  <p className="text-rihla-text/80 text-sm leading-relaxed">
                    {data.personalization_note}
                  </p>
                </div>
              </div>
            </div>
          </motion.section>

          {/* ── Actions ──────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="flex flex-wrap items-center gap-3 pt-4 pb-12 no-print"
          >
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-rihla-gold/10 border border-rihla-gold/30 hover:bg-rihla-gold/20 text-rihla-accent px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a1 1 0 001 1h8a1 1 0 001-1v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a1 1 0 00-1-1H6a1 1 0 00-1 1zm2 0h6v3H7V4zm-1 9a1 1 0 011-1h6a1 1 0 011 1v3H6v-3zm8-6H6V6h8v1z" clipRule="evenodd" />
              </svg>
              {t('itinerary.savePdf')}
            </button>

            <button
              onClick={() => navigate('/chat')}
              className="flex items-center gap-2 text-rihla-muted hover:text-rihla-text text-sm transition-colors px-4 py-2.5"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              {t('itinerary.back')}
            </button>

            <button
              onClick={() => navigate('/chat')}
              className="ml-auto flex items-center gap-2 text-rihla-primary px-6 py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-90"
              style={{ background: 'var(--rihla-brand-gradient)' }}
            >
              {t('itinerary.book')}
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </motion.div>
        </div>

        {/* ── Refinement bar (floating, no-print) ──────────────────── */}
        <div className="h-24 no-print" aria-hidden="true" />
        <RefinementBar onSubmit={handleRefine} disabled={refining} />

        {/* ── Refining overlay ─────────────────────────────────────── */}
        <AnimatePresence>
          {refining && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center"
              style={{ background: 'var(--rihla-overlay)', backdropFilter: 'blur(12px)' }}
            >
              <div className="text-center space-y-5 px-6">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  className="w-12 h-12 mx-auto rounded-full border-2 border-rihla-gold/30 border-t-rihla-gold"
                />
                <div>
                  <p className="font-display text-xl text-rihla-text mb-1">{t('itinerary.refining')}</p>
                  <p className="text-rihla-muted text-sm">{t('itinerary.refiningSub')}</p>
                </div>
                {refineError && <p className="text-red-400 text-xs">{refineError}</p>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
