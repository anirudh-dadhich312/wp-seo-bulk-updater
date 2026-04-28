import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, RotateCcw, Download, Pencil, X, Save, CheckCircle, XCircle, Clock, Loader2, AlertCircle, Globe, Zap, StopCircle, ShieldAlert, SearchX, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import api from '../api/axios';

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } };
const fadeUp  = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } };

const STATUS_CFG = {
  draft:     { label: 'Draft',     card: 'border-gray-200 dark:border-white/10',                                     badge: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-500/15 dark:text-gray-400 dark:border-gray-500/25',               dot: 'bg-gray-400',                    icon: Clock },
  running:   { label: 'Running',   card: 'border-blue-200 bg-blue-50/50 dark:border-blue-500/30 dark:bg-blue-500/5', badge: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/25',               dot: 'bg-blue-500 animate-pulse',      icon: Loader2 },
  completed: { label: 'Completed', card: 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-500/5', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/25', dot: 'bg-emerald-500', icon: CheckCircle },
  failed:    { label: 'Failed',    card: 'border-red-200 bg-red-50/50 dark:border-red-500/30 dark:bg-red-500/5',    badge: 'bg-red-100 text-red-600 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/25',                   dot: 'bg-red-500',                     icon: XCircle },
  cancelled: { label: 'Cancelled', card: 'border-amber-200 bg-amber-50/50 dark:border-amber-500/30 dark:bg-amber-500/5', badge: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/25', dot: 'bg-amber-500', icon: StopCircle },
};

const ROW_STATUS = {
  pending: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-500/15 dark:text-gray-400 dark:border-gray-500/25',
  success: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/25',
  failed:  'bg-red-100 text-red-600 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/25',
  skipped:   'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/25',
};

const SSE_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api$/, '')
  : '';

/* ── Classify a raw WP error string into a known category ─── */
function classifyError(msg = '') {
  const m = msg.toLowerCase();
  if (m.includes('not allowed') || m.includes('forbidden') || m.includes('permission') || m.includes('unauthorized'))
    return 'permission';
  if (m.includes('not found for url') || m.includes('post not found') || m.includes('could not extract slug'))
    return 'not_found';
  if (m.includes('network') || m.includes('timeout') || m.includes('econnrefused') || m.includes('econnreset'))
    return 'network';
  return 'other';
}

const ERROR_META = {
  permission: {
    icon:  ShieldAlert,
    color: 'text-amber-600 dark:text-amber-400',
    bg:    'bg-amber-50 dark:bg-amber-500/10',
    border:'border-amber-200 dark:border-amber-500/20',
    title: 'WordPress permission denied',
    body:  'The Application Password user does not have sufficient rights to update these posts or taxonomy terms.',
    fixes: [
      'In WordPress Admin → Users, find the user whose Application Password you added.',
      'Change their role to Editor or Administrator (Contributor / Subscriber cannot edit meta).',
      'For category/tag SEO updates the user must have the manage_categories capability — Editor role or above.',
      'After changing the role, re-run this job.',
    ],
  },
  not_found: {
    icon:  SearchX,
    color: 'text-red-600 dark:text-red-400',
    bg:    'bg-red-50 dark:bg-red-500/10',
    border:'border-red-200 dark:border-red-500/20',
    title: 'Post / page not found',
    body:  'The URL resolver could not match these URLs to a WordPress post, page, or term.',
    fixes: [
      'Double-check the URLs in your CSV — they must be the exact permalink, not a redirect or alias.',
      'If the page uses a custom post type, make sure it has REST API support enabled (show_in_rest: true in the CPT registration).',
      'Pages like /gallery/ or /iko-certified/ may be custom post types. Ask your developer to confirm the post type slug and enable its REST API.',
      'For pages hidden behind a login or with a draft/private status, the user must have read access.',
    ],
  },
  network: {
    icon:  AlertCircle,
    color: 'text-blue-600 dark:text-blue-400',
    bg:    'bg-blue-50 dark:bg-blue-500/10',
    border:'border-blue-200 dark:border-blue-500/20',
    title: 'Network / connection error',
    body:  'The server could not reach the WordPress site during the update.',
    fixes: [
      'Verify the site URL in Client Sites is correct and the site is online.',
      'Check if a firewall or Cloudflare rule is blocking requests from this server.',
      'Increase the timeout or retry the job — transient network errors often resolve on a second run.',
    ],
  },
  other: {
    icon:  AlertCircle,
    color: 'text-gray-600 dark:text-gray-400',
    bg:    'bg-gray-50 dark:bg-gray-500/10',
    border:'border-gray-200 dark:border-gray-500/20',
    title: 'Unexpected error',
    body:  'An error occurred that was not recognised as a common failure type.',
    fixes: [
      'Read the full error message in the table below for details.',
      'Check the WordPress site error logs (WP_DEBUG_LOG) for more context.',
    ],
  },
};

function ErrorDiagnosis({ rows }) {
  const [open, setOpen] = useState(true);

  const failed = rows.filter((r) => r.status === 'failed' && r.error);
  if (!failed.length) return null;

  // Group by category
  const groups = {};
  for (const r of failed) {
    const cat = classifyError(r.error);
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(r);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-red-200 dark:border-red-500/25 bg-red-50/60 dark:bg-red-500/5 overflow-hidden"
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span className="text-sm font-semibold text-red-700 dark:text-red-400">
            {failed.length} row{failed.length !== 1 ? 's' : ''} failed — click to see how to fix
          </span>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-red-400" />
          : <ChevronDown className="w-4 h-4 text-red-400" />}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4">
              {Object.entries(groups).map(([cat, catRows]) => {
                const m = ERROR_META[cat] || ERROR_META.other;
                const Icon = m.icon;
                return (
                  <div key={cat} className={`rounded-xl border p-4 ${m.bg} ${m.border}`}>
                    <div className="flex items-start gap-3">
                      <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${m.color}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${m.color}`}>
                          {m.title}
                          <span className="ml-2 font-normal text-xs opacity-70">
                            ({catRows.length} row{catRows.length !== 1 ? 's' : ''})
                          </span>
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{m.body}</p>

                        <ul className="mt-3 space-y-1.5">
                          {m.fixes.map((fix, i) => (
                            <li key={i} className="flex gap-2 text-xs text-gray-700 dark:text-gray-300">
                              <span className="font-bold text-gray-400 flex-shrink-0">{i + 1}.</span>
                              <span>{fix}</span>
                            </li>
                          ))}
                        </ul>

                        {/* Affected URLs */}
                        <details className="mt-3">
                          <summary className="text-xs font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none">
                            Affected URLs ({catRows.length})
                          </summary>
                          <ul className="mt-2 space-y-1">
                            {catRows.map((r, i) => (
                              <li key={i} className="flex items-start gap-1.5 text-xs">
                                <a href={r.postUrl} target="_blank" rel="noreferrer"
                                  className="text-indigo-600 dark:text-indigo-400 hover:underline break-all flex items-center gap-0.5">
                                  {r.postUrl}
                                  <ExternalLink className="w-2.5 h-2.5 flex-shrink-0 inline" />
                                </a>
                                {r.error && (
                                  <span className="text-red-500 dark:text-red-400 italic flex-shrink-0">
                                    — {r.error}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </details>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function JobDetail() {
  const { id } = useParams();
  const [job,        setJob]       = useState(null);
  const [editing,    setEditing]   = useState(false);
  const [rows,       setRows]      = useState([]);
  const [liveStats,  setLiveStats] = useState(null);
  const [sseActive,  setSseActive] = useState(false);
  const [cancelling, setCancelling]= useState(false);

  const sseRef      = useRef(null);   // active EventSource
  const retryRef    = useRef(null);   // retry timer
  const retryCount  = useRef(0);
  const editingRef  = useRef(false);
  const unmounted   = useRef(false);

  editingRef.current = editing;

  const load = useCallback(async () => {
    const { data } = await api.get(`/jobs/${id}`);
    if (unmounted.current) return data;
    setJob(data);
    setLiveStats(null);
    if (!editingRef.current) setRows(data.rows);
    return data;
  }, [id]);

  const closeSse = useCallback(() => {
    clearTimeout(retryRef.current);
    sseRef.current?.close();
    sseRef.current = null;
    setSseActive(false);
  }, []);

  // Opens a single EventSource connection. On error, retries with capped
  // exponential backoff (1 s → 2 s → 4 s → 8 s, max 3 retries then gives up).
  // Never falls back to API polling — the server holds the connection open.
  const openSse = useCallback(() => {
    if (sseRef.current || unmounted.current) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    // Use the Vite dev-proxy path (/api/…) — works in both dev and prod
    const url = `${SSE_BASE}/api/jobs/${id}/events?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    sseRef.current = es;
    setSseActive(true);

    es.onmessage = (e) => {
      if (unmounted.current) return;
      try {
        const msg = JSON.parse(e.data);

        if (msg.type === 'snapshot') {
          retryCount.current = 0; // successful connection — reset backoff
          setJob((prev) => {
            if (!prev) return prev;
            // Don't downgrade 'running' → 'draft': DB write is async and may
            // not have landed yet when we read the snapshot.
            const status =
              prev.status === 'running' && msg.status === 'draft'
                ? 'running'
                : msg.status;
            return { ...prev, status };
          });
          setLiveStats({ successCount: msg.successCount, failedCount: msg.failedCount });
        }

        if (msg.type === 'progress') {
          setLiveStats({ successCount: msg.successCount, failedCount: msg.failedCount });
          if (!editingRef.current) {
            setRows((prev) => {
              const next = [...prev];
              if (next[msg.rowIndex] !== undefined) {
                next[msg.rowIndex] = {
                  ...next[msg.rowIndex],
                  status: msg.rowStatus,
                  // error is now piped directly through SSE — no extra fetch needed
                  ...(msg.rowError ? { error: msg.rowError } : {}),
                };
              }
              return next;
            });
          }
        }

        if (msg.type === 'done') {
          es.close();
          sseRef.current = null;
          setSseActive(false);
          // One authoritative reload from DB after the job finishes
          load();
        }
      } catch (_) {}
    };

    es.onerror = () => {
      if (unmounted.current) return;
      es.close();
      sseRef.current = null;
      setSseActive(false);

      const MAX_RETRIES = 3;
      if (retryCount.current < MAX_RETRIES) {
        // Exponential backoff: 1 s, 2 s, 4 s
        const delay = Math.pow(2, retryCount.current) * 1000;
        retryCount.current += 1;
        retryRef.current = setTimeout(() => {
          if (!unmounted.current) openSse();
        }, delay);
      }
      // After MAX_RETRIES the user sees the last known state.
      // They can refresh the page if the job is still running.
    };
  }, [id, load]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial load
  useEffect(() => {
    unmounted.current = false;
    load();
    return () => {
      unmounted.current = true;
      closeSse();
    };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Open / close SSE based on job status
  useEffect(() => {
    if (!job) return;
    if (job.status === 'running') {
      openSse();
    } else {
      closeSse();
      setCancelling(false);
    }
  }, [job?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!job) return (
    <div className="flex items-center gap-3 text-gray-400 p-8">
      <Loader2 className="w-5 h-5 animate-spin text-indigo-500" /> Loading job…
    </div>
  );

  const updateRow = (i, field, val) => {
    const next = [...rows]; next[i] = { ...next[i], [field]: val }; setRows(next);
  };
  const saveRows = async () => { await api.put(`/jobs/${id}/rows`, { rows }); setEditing(false); load(); };
  const runJob = async () => {
    if (!window.confirm(`Run bulk update for ${job.totalRows} posts on ${job.site?.name}?`)) return;
    await api.post(`/jobs/${id}/run`);
    // Optimistically flip to 'running' so the SSE connection opens immediately.
    // The DB update inside runBulkJob is async — a load() here would often still
    // see 'draft', causing the status-change effect to miss the 'running' transition.
    setJob((prev) => prev ? { ...prev, status: 'running' } : prev);
  };
  const rollback = async () => {
    if (!window.confirm('Roll back all successful changes from this job?')) return;
    await api.post(`/jobs/${id}/rollback`); load();
  };
  const stopJob = async () => {
    if (!window.confirm('Stop this job? Rows already in progress will finish, remaining rows will be skipped.')) return;
    setCancelling(true);
    try { await api.post(`/jobs/${id}/cancel`); } catch (_) {}
  };
  const downloadReport = async () => {
    const res = await api.get(`/jobs/${id}/report`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a'); a.href = url; a.download = `job-${id}-report.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  // Use live SSE counts when available, fall back to DB values
  const successCount = liveStats?.successCount ?? job.successCount;
  const failedCount  = liveStats?.failedCount  ?? job.failedCount;
  const progress = job.totalRows > 0
    ? Math.round(((successCount + failedCount) / job.totalRows) * 100)
    : 0;
  const cfg = STATUS_CFG[job.status] || STATUS_CFG.draft;

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6 max-w-6xl">
      <motion.div variants={fadeUp}>
        <Link to="/app/bulk-update" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" /> New Bulk Update
        </Link>
      </motion.div>

      {/* Header card */}
      <motion.div variants={fadeUp} className={`bg-white border rounded-2xl p-5 sm:p-6 dark:bg-white/[0.05] dark:backdrop-blur-xl dark:shadow-none ${cfg.card}`}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 bg-indigo-50 border border-indigo-100 dark:bg-indigo-500/20 dark:border-indigo-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Globe className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-tight">{job.site?.name}</h1>
              <p className="text-sm mt-0.5">
                <span className="text-gray-400">{job.site?.siteUrl}</span>{' · '}
                <span className="font-mono text-indigo-600 dark:text-indigo-400">{job.site?.detectedPlugin}</span>
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {job.totalRows} rows · <span className="text-emerald-600 dark:text-emerald-400 font-medium">{successCount} success</span> · <span className="text-red-500 dark:text-red-400 font-medium">{failedCount} failed</span>
                </span>
                {sseActive && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <Zap className="w-3 h-3" /> Live
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0">
            {job.status === 'running' && (
              <button onClick={stopJob} disabled={cancelling}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl transition shadow-md shadow-red-500/20">
                {cancelling
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Stopping…</>
                  : <><StopCircle className="w-3.5 h-3.5" /> Stop Job</>}
              </button>
            )}
            {job.status === 'draft' && (
              <>
                {editing ? (
                  <>
                    <button onClick={() => setEditing(false)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 bg-gray-100 border border-gray-200 rounded-xl hover:bg-gray-200 dark:text-gray-400 dark:bg-white/[0.06] dark:border-white/10 dark:hover:bg-white/10 transition">
                      <X className="w-3.5 h-3.5" /> Cancel
                    </button>
                    <button onClick={saveRows}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-800 bg-gray-200 border border-gray-300 rounded-xl hover:bg-gray-300 dark:text-white dark:bg-white/10 dark:border-white/15 dark:hover:bg-white/15 transition">
                      <Save className="w-3.5 h-3.5" /> Save Edits
                    </button>
                  </>
                ) : (
                  <button onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 bg-gray-100 border border-gray-200 rounded-xl hover:bg-gray-200 dark:text-gray-400 dark:bg-white/[0.06] dark:border-white/10 dark:hover:bg-white/10 transition">
                    <Pencil className="w-3.5 h-3.5" /> Edit Rows
                  </button>
                )}
                <motion.button onClick={runJob} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl shadow-md shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-shadow">
                  <Play className="w-3.5 h-3.5" /> Run Bulk Update
                </motion.button>
              </>
            )}
            {job.status === 'completed' && (
              <>
                <button onClick={downloadReport}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 bg-gray-100 border border-gray-200 rounded-xl hover:bg-gray-200 dark:text-gray-300 dark:bg-white/[0.06] dark:border-white/10 dark:hover:bg-white/10 transition">
                  <Download className="w-3.5 h-3.5" /> Download Report
                </button>
                <motion.button onClick={rollback} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition shadow-md shadow-red-500/20">
                  <RotateCcw className="w-3.5 h-3.5" /> Rollback
                </motion.button>
              </>
            )}
          </div>
        </div>

        <AnimatePresence>
          {job.status === 'running' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {sseActive ? 'Live update streaming…' : 'Running… auto-refreshing'}
                </span>
                <span className="text-sm font-bold text-blue-700 dark:text-blue-300">{progress}%</span>
              </div>
              <div className="w-full bg-blue-100 dark:bg-blue-500/10 rounded-full h-2.5 overflow-hidden border border-blue-200 dark:border-blue-500/20">
                <motion.div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2.5 rounded-full"
                  animate={{ width: `${progress}%` }} transition={{ duration: 0.3, ease: 'easeOut' }} />
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-blue-600/70 dark:text-blue-400/70">
                <span>{successCount + failedCount} of {job.totalRows} processed</span>
                {failedCount > 0 && <span className="text-red-500 dark:text-red-400">{failedCount} failed</span>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Error diagnosis — only when there are failures */}
      {(job.status === 'completed' || job.status === 'cancelled') && failedCount > 0 && (
        <motion.div variants={fadeUp}>
          <ErrorDiagnosis rows={rows} />
        </motion.div>
      )}

      {/* Rows table */}
      <motion.div variants={fadeUp} className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden dark:bg-white/[0.05] dark:backdrop-blur-xl dark:border-white/10 dark:shadow-none">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-white/[0.06] flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200">{rows.length} rows</h2>
          {editing && (
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 px-2.5 py-1 rounded-full">
              Editing mode
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/[0.06]">
                {['Post URL', 'Meta Title', 'Meta Description', 'Status'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap bg-gray-50/80 dark:bg-white/[0.02]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-white/[0.04]">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors">
                  <td className="px-4 py-3 max-w-[200px]">
                    <a href={r.postUrl} target="_blank" rel="noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 truncate block text-xs transition-colors">
                      {r.postUrl}
                    </a>
                  </td>
                  <td className="px-4 py-3 max-w-[220px]">
                    {editing ? (
                      <input value={r.newTitle || ''} onChange={(e) => updateRow(i, 'newTitle', e.target.value)}
                        className="w-full border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/[0.06] rounded-lg px-2.5 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500/60 transition-colors" />
                    ) : (
                      <span className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">{r.newTitle}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-[280px]">
                    {editing ? (
                      <input value={r.newDescription || ''} onChange={(e) => updateRow(i, 'newDescription', e.target.value)}
                        className="w-full border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/[0.06] rounded-lg px-2.5 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500/60 transition-colors" />
                    ) : (
                      <span className="text-xs text-gray-400 line-clamp-2">{r.newDescription}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <AnimatePresence mode="wait">
                      <motion.span key={r.status}
                        initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${ROW_STATUS[r.status] || ROW_STATUS.pending}`}>
                        {r.status}
                      </motion.span>
                    </AnimatePresence>
                    {r.error && (
                      <p className="flex items-start gap-1 text-xs text-red-500 dark:text-red-400 mt-1.5 leading-snug max-w-[220px]">
                        <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                        <span className="break-words">{r.error}</span>
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
