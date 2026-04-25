import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, RotateCcw, Download, Pencil, X, Save, CheckCircle, XCircle, Clock, Loader2, AlertCircle, Globe, Zap, StopCircle } from 'lucide-react';
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

export default function JobDetail() {
  const { id } = useParams();
  const [job,       setJob]      = useState(null);
  const [editing,   setEditing]  = useState(false);
  const [rows,      setRows]     = useState([]);
  const [liveStats,   setLiveStats]   = useState(null); // real-time counts from SSE
  const [sseActive,   setSseActive]   = useState(false);
  const [cancelling,  setCancelling]  = useState(false);
  const sseRef    = useRef(null);
  const pollRef   = useRef(null);
  const editingRef = useRef(false);

  editingRef.current = editing;

  const load = useCallback(async () => {
    const { data } = await api.get(`/jobs/${id}`);
    setJob(data);
    setLiveStats(null); // reset live overlay once we have fresh DB data
    if (!editingRef.current) setRows(data.rows);
    return data;
  }, [id]);

  // Opens an SSE connection and drives real-time progress updates
  const openSse = useCallback(() => {
    if (sseRef.current) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    const url = `${SSE_BASE}/api/jobs/${id}/events?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    sseRef.current = es;
    setSseActive(true);

    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);

        if (msg.type === 'snapshot') {
          // Initial state from server — sync job status without a full reload
          setJob((prev) => prev ? { ...prev, status: msg.status } : prev);
        }

        if (msg.type === 'progress') {
          // Update live counters and per-row statuses in real time
          setLiveStats({ successCount: msg.successCount, failedCount: msg.failedCount });
          if (!editingRef.current) {
            setRows((prev) => {
              const next = [...prev];
              if (next[msg.rowIndex]) {
                next[msg.rowIndex] = { ...next[msg.rowIndex], status: msg.rowStatus };
              }
              return next;
            });
          }
        }

        if (msg.type === 'done') {
          es.close();
          sseRef.current = null;
          setSseActive(false);
          // Full reload from DB to get final authoritative state
          load();
        }
      } catch (_) {}
    };

    es.onerror = () => {
      // SSE connection dropped — fall back to polling
      es.close();
      sseRef.current = null;
      setSseActive(false);
      if (!pollRef.current) {
        pollRef.current = setInterval(load, 2000);
      }
    };
  }, [id, load]);

  const closeSse = useCallback(() => {
    sseRef.current?.close();
    sseRef.current = null;
    setSseActive(false);
  }, []);

  // Initial load
  useEffect(() => {
    load();
    return () => {
      closeSse();
      clearInterval(pollRef.current);
    };
  }, [id]);

  // React to job status changes
  useEffect(() => {
    if (!job) return;

    if (job.status === 'running') {
      clearInterval(pollRef.current);
      pollRef.current = null;
      openSse();
    } else {
      closeSse();
      clearInterval(pollRef.current);
      pollRef.current = null;
      setCancelling(false);
    }
  }, [job?.status]);

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
    await api.post(`/jobs/${id}/run`); load();
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
        <Link to="/bulk-update" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors">
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
                  <td className="px-4 py-3 whitespace-nowrap">
                    <AnimatePresence mode="wait">
                      <motion.span key={r.status}
                        initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${ROW_STATUS[r.status] || ROW_STATUS.pending}`}>
                        {r.status}
                      </motion.span>
                    </AnimatePresence>
                    {r.error && (
                      <p className="flex items-center gap-1 text-xs text-red-500 dark:text-red-400 mt-1">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate max-w-[160px]">{r.error}</span>
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
