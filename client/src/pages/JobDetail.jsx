import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Play, RotateCcw, Download, Pencil, X, Save,
  CheckCircle, XCircle, Clock, Loader2, AlertCircle, Globe,
} from 'lucide-react';
import api from '../api/axios';

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } };
const fadeUp  = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } };

const STATUS_CFG = {
  draft:     { label: 'Draft',     card: 'border-white/10',                   badge: 'bg-gray-500/15 text-gray-400 border-gray-500/25',         dot: 'bg-gray-500',                    icon: Clock },
  running:   { label: 'Running',   card: 'border-blue-500/30 bg-blue-500/5',  badge: 'bg-blue-500/15 text-blue-300 border-blue-500/25',          dot: 'bg-blue-400 animate-pulse',      icon: Loader2 },
  completed: { label: 'Completed', card: 'border-emerald-500/30 bg-emerald-500/5', badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25', dot: 'bg-emerald-400',            icon: CheckCircle },
  failed:    { label: 'Failed',    card: 'border-red-500/30 bg-red-500/5',    badge: 'bg-red-500/15 text-red-300 border-red-500/25',             dot: 'bg-red-400',                     icon: XCircle },
};

const ROW_STATUS = {
  pending: 'bg-gray-500/15 text-gray-400 border-gray-500/25',
  success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  failed:  'bg-red-500/15 text-red-300 border-red-500/25',
  skipped: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
};

export default function JobDetail() {
  const { id } = useParams();
  const [job,     setJob]     = useState(null);
  const [editing, setEditing] = useState(false);
  const [rows,    setRows]    = useState([]);
  const pollRef = useRef(null);

  const load = async () => {
    const { data } = await api.get(`/jobs/${id}`);
    setJob(data);
    if (!editing) setRows(data.rows);
    return data;
  };

  useEffect(() => { load(); return () => clearInterval(pollRef.current); }, [id]);

  useEffect(() => {
    if (job?.status === 'running') {
      pollRef.current = setInterval(load, 2000);
      return () => clearInterval(pollRef.current);
    }
  }, [job?.status]);

  if (!job) return (
    <div className="flex items-center gap-3 text-gray-500 p-8">
      <Loader2 className="w-5 h-5 animate-spin text-indigo-400" /> Loading job…
    </div>
  );

  const updateRow = (i, field, val) => {
    const next = [...rows];
    next[i] = { ...next[i], [field]: val };
    setRows(next);
  };

  const saveRows = async () => {
    await api.put(`/jobs/${id}/rows`, { rows });
    setEditing(false);
    load();
  };

  const runJob = async () => {
    if (!window.confirm(`Run bulk update for ${job.totalRows} posts on ${job.site?.name}?`)) return;
    await api.post(`/jobs/${id}/run`);
    load();
  };

  const rollback = async () => {
    if (!window.confirm('Roll back all successful changes from this job?')) return;
    await api.post(`/jobs/${id}/rollback`);
    load();
  };

  const downloadReport = async () => {
    const res = await api.get(`/jobs/${id}/report`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a   = document.createElement('a');
    a.href = url; a.download = `job-${id}-report.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const progress = job.totalRows > 0
    ? Math.round(((job.successCount + job.failedCount) / job.totalRows) * 100)
    : 0;

  const cfg        = STATUS_CFG[job.status] || STATUS_CFG.draft;
  const StatusIcon = cfg.icon;

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6 max-w-6xl">

      {/* Back */}
      <motion.div variants={fadeUp}>
        <Link to="/bulk-update" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-400 font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" /> New Bulk Update
        </Link>
      </motion.div>

      {/* Header card */}
      <motion.div variants={fadeUp} className={`bg-white/[0.05] backdrop-blur-xl border rounded-2xl p-5 sm:p-6 ${cfg.card}`}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/20 rounded-xl shadow-sm flex items-center justify-center flex-shrink-0">
              <Globe className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">{job.site?.name}</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                <span className="text-gray-400">{job.site?.siteUrl}</span> ·{' '}
                <span className="font-mono text-indigo-400">{job.site?.detectedPlugin}</span>
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </span>
                <span className="text-xs text-gray-600">
                  <span className="text-gray-300">{job.totalRows} rows</span> · <span className="text-emerald-400 font-medium">{job.successCount} success</span> · <span className="text-red-400 font-medium">{job.failedCount} failed</span>
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0">
            {job.status === 'draft' && (
              <>
                {editing ? (
                  <>
                    <button
                      onClick={() => setEditing(false)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-400 bg-white/[0.06] border border-white/10 rounded-xl hover:bg-white/10 transition"
                    >
                      <X className="w-3.5 h-3.5" /> Cancel
                    </button>
                    <button
                      onClick={saveRows}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-white/10 border border-white/15 rounded-xl hover:bg-white/15 transition"
                    >
                      <Save className="w-3.5 h-3.5" /> Save Edits
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-400 bg-white/[0.06] border border-white/10 rounded-xl hover:bg-white/10 transition"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit Rows
                  </button>
                )}
                <motion.button
                  onClick={runJob}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl shadow-md shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-shadow"
                >
                  <Play className="w-3.5 h-3.5" /> Run Bulk Update
                </motion.button>
              </>
            )}
            {job.status === 'completed' && (
              <>
                <button
                  onClick={downloadReport}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-300 bg-white/[0.06] border border-white/10 rounded-xl hover:bg-white/10 transition"
                >
                  <Download className="w-3.5 h-3.5" /> Download Report
                </button>
                <motion.button
                  onClick={rollback}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-red-500/80 hover:bg-red-500 rounded-xl transition shadow-md shadow-red-500/20"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Rollback
                </motion.button>
              </>
            )}
          </div>
        </div>

        {/* Running progress */}
        <AnimatePresence>
          {job.status === 'running' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-blue-500/20"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-blue-300 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Running… auto-refreshing every 2s
                </span>
                <span className="text-sm font-bold text-blue-300">{progress}%</span>
              </div>
              <div className="w-full bg-blue-500/10 rounded-full h-2 overflow-hidden border border-blue-500/20">
                <motion.div
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full shadow-sm shadow-blue-500/50"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Rows table */}
      <motion.div variants={fadeUp} className="bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-200">{rows.length} rows</h2>
          {editing && (
            <span className="text-xs font-semibold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full">
              Editing mode
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Post URL', 'Meta Title', 'Meta Description', 'Status'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap bg-white/[0.02]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-4 py-3 max-w-[200px]">
                    <a
                      href={r.postUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 truncate block text-xs transition-colors"
                    >
                      {r.postUrl}
                    </a>
                  </td>
                  <td className="px-4 py-3 max-w-[220px]">
                    {editing ? (
                      <input
                        value={r.newTitle || ''}
                        onChange={(e) => updateRow(i, 'newTitle', e.target.value)}
                        className="w-full border border-white/10 bg-white/[0.06] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500/60 transition-colors"
                      />
                    ) : (
                      <span className="text-xs text-gray-300 line-clamp-2">{r.newTitle}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-[280px]">
                    {editing ? (
                      <input
                        value={r.newDescription || ''}
                        onChange={(e) => updateRow(i, 'newDescription', e.target.value)}
                        className="w-full border border-white/10 bg-white/[0.06] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500/60 transition-colors"
                      />
                    ) : (
                      <span className="text-xs text-gray-400 line-clamp-2">{r.newDescription}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${ROW_STATUS[r.status] || ROW_STATUS.pending}`}>
                      {r.status}
                    </span>
                    {r.error && (
                      <p className="flex items-center gap-1 text-xs text-red-400 mt-1">
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
