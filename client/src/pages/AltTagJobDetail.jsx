import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image, Play, Square, CheckCircle2, XCircle, AlertCircle,
  Loader2, Wand2, Filter, ArrowLeft, ExternalLink,
  ChevronDown, ChevronUp, Save, Clock,
} from 'lucide-react';
import api from '../api/axios';

/* ── Utility: generate SEO-friendly alt text from a filename ── */
function altFromFilename(filename) {
  return filename
    .replace(/\.[^.]+$/, '')          // strip extension
    .replace(/[-_]+/g, ' ')           // hyphens/underscores → spaces
    .replace(/\b\d{4}\b/g, '')        // remove 4-digit years
    .replace(/\b\d+x\d+\b/g, '')      // remove dimension strings (1920x1080)
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase()); // title case
}

/* ── Status badge ─────────────────────────────────────────── */
const STATUS_META = {
  pending:  { label: 'Pending',  color: 'text-gray-500   dark:text-gray-400',   bg: 'bg-gray-100   dark:bg-white/[0.06]'  },
  success:  { label: 'Updated',  color: 'text-green-600  dark:text-green-400',  bg: 'bg-green-50   dark:bg-green-500/10'  },
  failed:   { label: 'Failed',   color: 'text-red-600    dark:text-red-400',    bg: 'bg-red-50     dark:bg-red-500/10'    },
  skipped:  { label: 'Skipped',  color: 'text-amber-600  dark:text-amber-400',  bg: 'bg-amber-50   dark:bg-amber-500/10'  },
};

function RowStatus({ status }) {
  const m = STATUS_META[status] || STATUS_META.pending;
  return (
    <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${m.color} ${m.bg}`}>
      {m.label}
    </span>
  );
}

/* ── Thumbnail with fallback ──────────────────────────────── */
function Thumb({ src, alt }) {
  const [err, setErr] = useState(false);
  if (err || !src) {
    return (
      <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center flex-shrink-0">
        <Image className="w-5 h-5 text-gray-300 dark:text-gray-600" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt || ''}
      onError={() => setErr(true)}
      className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-gray-100 dark:border-white/[0.06]"
    />
  );
}

/* ── Main component ───────────────────────────────────────── */
export default function AltTagJobDetail() {
  const { id } = useParams();

  const [job, setJob]         = useState(null);
  const [items, setItems]     = useState([]);
  const [filter, setFilter]   = useState('all');  // 'all' | 'missing' | 'has_alt'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(null); // { updatedCount, failedCount, total }
  const [saveError, setSaveError] = useState('');
  const [expanded, setExpanded]   = useState(new Set());

  const esRef = useRef(null);

  /* ── Fetch job ── */
  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/alt-tag-jobs/${id}`);
      setJob(data);
      setItems(data.items || []);
    } catch (_) {}
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  /* ── Auto-poll while scanning ── */
  useEffect(() => {
    if (job?.status !== 'scanning') return;
    const timer = setInterval(load, 2000);
    return () => clearInterval(timer);
  }, [job?.status, load]);

  /* ── SSE while running ── */
  useEffect(() => {
    if (job?.status !== 'running') return;

    const token = localStorage.getItem('token');
    const es = new EventSource(`/api/alt-tag-jobs/${id}/events?token=${token}`);
    esRef.current = es;
    setRunning(true);

    es.addEventListener('snapshot', (e) => {
      const data = JSON.parse(e.data);
      setJob(data);
      setItems(data.items || []);
    });

    es.addEventListener('progress', (e) => {
      const d = JSON.parse(e.data);
      setProgress({ updatedCount: d.updatedCount, failedCount: d.failedCount, total: d.total });
      // Update specific row status
      setItems((prev) => {
        const next = [...prev];
        if (next[d.idx]) next[d.idx] = { ...next[d.idx], status: d.rowStatus };
        return next;
      });
    });

    es.addEventListener('done', () => {
      es.close();
      setRunning(false);
      load();
    });

    es.onerror = () => { es.close(); setRunning(false); load(); };

    return () => es.close();
  }, [job?.status, id, load]);

  /* ── Actions ── */
  const saveItems = async () => {
    setSaveError('');
    setSaving(true);
    try {
      await api.put(`/alt-tag-jobs/${id}/items`, {
        items: items.map((i) => ({ attachmentId: i.attachmentId, newAlt: i.newAlt || '' })),
      });
    } catch (err) {
      setSaveError(err.response?.data?.error || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const runJob = async () => {
    await saveItems();
    try {
      await api.post(`/alt-tag-jobs/${id}/run`);
      setJob((j) => ({ ...j, status: 'running' }));
    } catch (err) {
      setSaveError(err.response?.data?.error || 'Failed to start job.');
    }
  };

  const cancelJob = async () => {
    await api.post(`/alt-tag-jobs/${id}/cancel`);
  };

  const autoFillAll = () => {
    setItems((prev) =>
      prev.map((item) =>
        !item.newAlt ? { ...item, newAlt: altFromFilename(item.filename) } : item
      )
    );
  };

  const autoFillOne = (idx) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === idx ? { ...item, newAlt: altFromFilename(item.filename) } : item
      )
    );
  };

  const setNewAlt = (idx, val) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, newAlt: val } : item)));
  };

  const toggleExpand = (idx) => {
    setExpanded((s) => {
      const n = new Set(s);
      n.has(idx) ? n.delete(idx) : n.add(idx);
      return n;
    });
  };

  /* ── Filtered view ── */
  const visible = items.filter((item) => {
    if (filter === 'missing') return !item.currentAlt;
    if (filter === 'has_alt') return !!item.currentAlt;
    return true;
  });

  const missingCount = items.filter((i) => !i.currentAlt).length;
  const queuedCount  = items.filter((i) => i.newAlt && i.newAlt.trim()).length;

  /* ── Loading / not found ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-24 text-gray-500">
        Job not found.{' '}
        <Link to="/app/alt-tags" className="text-cyan-600 hover:underline">Go back</Link>
      </div>
    );
  }

  const isDraft     = job.status === 'draft';
  const isScanning  = job.status === 'scanning';
  const isRunning   = job.status === 'running';
  const isCompleted = job.status === 'completed';
  const isFailed    = job.status === 'failed';

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Back link */}
      <Link
        to="/app/alt-tags"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Alt Tags
      </Link>

      {/* Header card */}
      <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.08] rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="w-11 h-11 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/25">
            <Image className="w-5 h-5 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">{job.site?.name}</h1>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                isScanning  ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' :
                isDraft     ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' :
                isRunning   ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400' :
                isCompleted ? 'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400' :
                              'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
              }`}>
                {isScanning ? 'Scanning…' : isRunning ? 'Running' : job.status.charAt(0).toUpperCase() + job.status.slice(1)}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {job.site?.siteUrl} · {new Date(job.createdAt).toLocaleDateString()}
            </p>

            {/* Stats row */}
            <div className="flex flex-wrap gap-4 mt-3">
              <div className="text-sm">
                <span className="text-gray-400 dark:text-gray-500">Total images </span>
                <span className="font-semibold text-gray-700 dark:text-gray-200">{job.totalItems}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-400 dark:text-gray-500">Missing alt </span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">{missingCount}</span>
              </div>
              {isDraft && (
                <div className="text-sm">
                  <span className="text-gray-400 dark:text-gray-500">Queued to update </span>
                  <span className="font-semibold text-cyan-600 dark:text-cyan-400">{queuedCount}</span>
                </div>
              )}
              {(isRunning || isCompleted) && progress && (
                <>
                  <div className="text-sm">
                    <span className="text-gray-400 dark:text-gray-500">Updated </span>
                    <span className="font-semibold text-green-600 dark:text-green-400">{progress.updatedCount}</span>
                  </div>
                  {progress.failedCount > 0 && (
                    <div className="text-sm">
                      <span className="text-gray-400 dark:text-gray-500">Failed </span>
                      <span className="font-semibold text-red-500">{progress.failedCount}</span>
                    </div>
                  )}
                </>
              )}
              {isCompleted && !progress && (
                <>
                  <div className="text-sm">
                    <span className="text-gray-400 dark:text-gray-500">Updated </span>
                    <span className="font-semibold text-green-600 dark:text-green-400">{job.updatedCount}</span>
                  </div>
                  {job.failedCount > 0 && (
                    <div className="text-sm">
                      <span className="text-gray-400 dark:text-gray-500">Failed </span>
                      <span className="font-semibold text-red-500">{job.failedCount}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Action buttons */}
          {isDraft && (
            <div className="flex gap-2 flex-shrink-0">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={saveItems}
                disabled={saving}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-white/[0.1] text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.06] disabled:opacity-50 transition-all"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={runJob}
                disabled={queuedCount === 0}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-3.5 h-3.5" />
                Apply Updates ({queuedCount})
              </motion.button>
            </div>
          )}

          {isRunning && (
            <button
              onClick={cancelJob}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-200 dark:border-red-500/30 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all flex-shrink-0"
            >
              <Square className="w-3.5 h-3.5" />
              Cancel
            </button>
          )}
        </div>

        {/* Progress bar when running */}
        {(isRunning && progress) && (
          <div className="mt-4">
            <div className="h-1.5 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.round(((progress.updatedCount + progress.failedCount) / (progress.total || 1)) * 100)}%` }}
                transition={{ ease: 'linear', duration: 0.3 }}
              />
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
              {progress.updatedCount + progress.failedCount} / {progress.total} processed
            </p>
          </div>
        )}

        {saveError && (
          <div className="mt-3 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl text-sm text-red-700 dark:text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {saveError}
          </div>
        )}
      </div>

      {/* Scanning spinner */}
      {isScanning && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
          <p className="text-sm">Scanning media library…</p>
        </div>
      )}

      {/* Failed scan */}
      {isFailed && (
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-2xl text-sm text-red-700 dark:text-red-400">
          <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Scan failed</p>
            <p className="mt-0.5 text-red-600/80 dark:text-red-400/70">{job.scanError}</p>
          </div>
        </div>
      )}

      {/* Toolbar + table — only when we have items */}
      {items.length > 0 && (
        <>
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Filter tabs */}
            <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-white/[0.05] rounded-xl">
              {[
                { key: 'all',      label: `All (${items.length})` },
                { key: 'missing',  label: `Missing alt (${missingCount})` },
                { key: 'has_alt',  label: `Has alt (${items.length - missingCount})` },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filter === key
                      ? 'bg-white dark:bg-white/[0.1] text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {isDraft && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={autoFillAll}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-xs font-semibold shadow-lg shadow-violet-500/20 ml-auto"
              >
                <Wand2 className="w-3.5 h-3.5" />
                Auto-generate all empty
              </motion.button>
            )}
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.08] rounded-2xl overflow-hidden">
            {/* Table header */}
            <div className="hidden sm:grid grid-cols-[3rem_1fr_1fr_1fr_6rem] gap-3 px-4 py-2.5 border-b border-gray-100 dark:border-white/[0.06] text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              <span />
              <span>Image</span>
              <span>Current Alt</span>
              <span>New Alt</span>
              <span>Status</span>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              <AnimatePresence initial={false}>
                {visible.map((item, vi) => {
                  const realIdx = items.findIndex((i) => i.attachmentId === item.attachmentId);
                  const isExp   = expanded.has(realIdx);

                  return (
                    <motion.div
                      key={item.attachmentId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      {/* Row */}
                      <div className="px-4 py-3">
                        {/* Mobile layout */}
                        <div className="sm:hidden flex items-start gap-3">
                          <Thumb src={item.sourceUrl} alt={item.currentAlt} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-[180px]">{item.filename}</p>
                              <RowStatus status={item.status} />
                            </div>
                            <p className="text-[11px] text-gray-400 mt-0.5 truncate">{item.currentAlt || <em>No alt text</em>}</p>
                            <button
                              onClick={() => toggleExpand(realIdx)}
                              className="text-[11px] text-cyan-600 dark:text-cyan-400 mt-1 flex items-center gap-0.5"
                            >
                              {isExp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              {isExp ? 'Less' : 'Edit alt text'}
                            </button>
                            {isExp && isDraft && (
                              <div className="mt-2 flex gap-1.5">
                                <input
                                  value={item.newAlt || ''}
                                  onChange={(e) => setNewAlt(realIdx, e.target.value)}
                                  placeholder="Enter new alt text…"
                                  className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.1] bg-gray-50 dark:bg-white/[0.05] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
                                />
                                <button
                                  onClick={() => autoFillOne(realIdx)}
                                  title="Auto-generate from filename"
                                  className="px-2 py-1.5 rounded-lg bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-500/20 transition-colors"
                                >
                                  <Wand2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Desktop layout */}
                        <div className="hidden sm:grid grid-cols-[3rem_1fr_1fr_1fr_6rem] gap-3 items-center">
                          <Thumb src={item.sourceUrl} alt={item.currentAlt} />

                          <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{item.filename}</p>
                            <a
                              href={item.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-0.5 text-[11px] text-gray-400 dark:text-gray-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors mt-0.5"
                            >
                              View <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>

                          <div className="min-w-0">
                            {item.currentAlt ? (
                              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{item.currentAlt}</p>
                            ) : (
                              <span className="text-[11px] text-amber-500 dark:text-amber-400 italic">No alt text</span>
                            )}
                          </div>

                          <div className="min-w-0">
                            {isDraft ? (
                              <div className="flex gap-1.5 items-center">
                                <input
                                  value={item.newAlt || ''}
                                  onChange={(e) => setNewAlt(realIdx, e.target.value)}
                                  placeholder="New alt text…"
                                  className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.1] bg-gray-50 dark:bg-white/[0.05] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
                                />
                                <button
                                  onClick={() => autoFillOne(realIdx)}
                                  title="Auto-generate from filename"
                                  className="flex-shrink-0 p-1.5 rounded-lg bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-500/20 transition-colors"
                                >
                                  <Wand2 className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{item.newAlt || '—'}</p>
                            )}
                          </div>

                          <div>
                            <RowStatus status={item.status} />
                            {item.error && (
                              <p className="text-[10px] text-red-500 mt-0.5 truncate" title={item.error}>{item.error}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {visible.length === 0 && (
                <div className="text-center py-10 text-sm text-gray-400 dark:text-gray-600">
                  No images match the current filter.
                </div>
              )}
            </div>
          </div>

          {/* Bottom action bar for draft */}
          {isDraft && (
            <div className="flex items-center justify-between p-4 bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.08] rounded-2xl sticky bottom-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {queuedCount === 0
                  ? 'Add new alt text to the fields above, then click Apply.'
                  : `${queuedCount} image${queuedCount !== 1 ? 's' : ''} will be updated.`}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={saveItems}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-white/[0.1] text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.06] disabled:opacity-50 transition-all"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save draft
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={runJob}
                  disabled={queuedCount === 0}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-3.5 h-3.5" />
                  Apply Updates ({queuedCount})
                </motion.button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
