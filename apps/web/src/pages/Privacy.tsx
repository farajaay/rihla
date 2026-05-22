import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSessionStore } from '../stores/sessionStore';
import { resetAnalytics } from '../lib/analytics';
import { useT } from '../lib/i18n';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

export default function Privacy() {
  const t = useT();
  const { sessionId, clearSession } = useSessionStore();
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState<'export' | 'delete' | null>(null);

  async function onExport() {
    if (!sessionId) return;
    setBusy('export');
    setStatus(null);
    try {
      const r = await fetch(`${API_BASE}/sessions/${sessionId}/export`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rihla-session-${sessionId}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus('Your data was downloaded.');
    } catch (err) {
      setStatus(`Export failed: ${(err as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  async function onDelete() {
    if (!sessionId) return;
    if (!confirm('Delete your session and all associated data? This cannot be undone.')) return;
    setBusy('delete');
    setStatus(null);
    try {
      const r = await fetch(`${API_BASE}/sessions/${sessionId}`, { method: 'DELETE' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      resetAnalytics();
      clearSession();
      setStatus('Your session and data have been deleted.');
    } catch (err) {
      setStatus(`Deletion failed: ${(err as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-dvh p-6 md:p-12 max-w-3xl mx-auto"
    >
      <Link to="/" className="text-rihla-muted text-sm hover:text-rihla-text">{t('privacy.back')}</Link>

      <h1 className="font-display text-4xl text-rihla-text mt-6 mb-2">{t('privacy.title')}</h1>
      <p className="text-rihla-muted text-sm mb-10">{t('privacy.pdplNote')}</p>

      <section className="space-y-8 text-rihla-text/90 leading-relaxed">
        <div>
          <h2 className="font-display text-xl text-rihla-text mb-3">{t('privacy.s1')}</h2>
          <p className="text-sm">
            We collect chat messages you send to plan your trip, anonymous device hints (timezone, browser language), and a one-way hashed IP for abuse prevention. We do <strong>not</strong> collect your name, email, phone, payment data, or precise location.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-rihla-text mb-3">{t('privacy.s2')}</h2>
          <p className="text-sm">
            Your messages are sent to Anthropic's Claude to power the conversation and to infer a traveler profile (preferred destinations, budget tier, activities). The profile is used only to personalize your itinerary.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-rihla-text mb-3">{t('privacy.s3')}</h2>
          <p className="text-sm mb-4">
            Under the Saudi Personal Data Protection Law (PDPL), you can access or delete your data at any time. Your session ID is the access key.
          </p>

          <div className="glass rounded-2xl p-5 space-y-3">
            <p className="text-rihla-muted text-xs">
              {t('privacy.sessionLabel')} <span className="text-rihla-text font-mono">{sessionId ?? '—'}</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onExport}
                disabled={!sessionId || busy !== null}
                className="bg-white/10 hover:bg-white/15 disabled:opacity-50 text-rihla-text rounded-lg px-4 py-2 text-sm transition"
              >
                {busy === 'export' ? t('privacy.preparing') : t('privacy.exportButton')}
              </button>
              <button
                onClick={onDelete}
                disabled={!sessionId || busy !== null}
                className="bg-red-500/20 hover:bg-red-500/30 disabled:opacity-50 text-red-200 rounded-lg px-4 py-2 text-sm transition"
              >
                {busy === 'delete' ? t('privacy.deleting') : t('privacy.deleteButton')}
              </button>
            </div>
            {status && <p className="text-rihla-muted text-xs">{status}</p>}
            {!sessionId && <p className="text-rihla-muted text-xs">{t('privacy.noSession')}</p>}
          </div>
        </div>

        <div>
          <h2 className="font-display text-xl text-rihla-text mb-3">{t('privacy.s4')}</h2>
          <ul className="text-sm list-disc list-inside space-y-1">
            <li><strong>Anthropic</strong> — chat content (no persistence beyond their stated retention)</li>
            <li><strong>PostHog</strong> — analytics events; no raw chat content</li>
            <li><strong>Vercel / Railway</strong> — hosting and managed database</li>
          </ul>
        </div>

        <div>
          <h2 className="font-display text-xl text-rihla-text mb-3">{t('privacy.s5')}</h2>
          <p className="text-sm">For privacy concerns, contact <span className="text-rihla-accent">privacy@rihla.example</span>.</p>
        </div>
      </section>
    </motion.div>
  );
}
