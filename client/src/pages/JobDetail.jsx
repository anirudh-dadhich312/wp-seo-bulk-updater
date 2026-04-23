import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Play, RotateCcw, Download, Pencil, X, Save,
  CheckCircle, XCircle, Clock, Loader2, AlertCircle, Globe,
} from 'lucide-react';
import api from '../api/axios';

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } };
const fadeUp  = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22,1,0.36,1] } } };

const STATUS_CFG = {
  draft:     { label: 'Draft',     card: 'bg-gray-50 border-gray-200',         badge: 'bg-gray-100 text-gray-600 border-gray-200',       dot: 'bg-gray-400',               icon: Clock },
  running:   { label: 'Running',   card: 'bg-blue-50 border-blue-200',         badge: 'bg-blue-100 text-blue-700 border-blue-200',        dot: 'bg-blue-500 animate-pulse', icon: Loader2 },
  completed: { label: 'Completed', card: 'bg-emerald-50 border-emerald-200',   badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500',           icon: CheckCircle },
  failed:    { label: 'Failed',    card: 'bg-red-50 border-red-200',           badge: 'bg-red-100 text-red-600 border-red-200',           dot: 'bg-red-500',                icon: XCircle },
};

const ROW_STATUS = {
  pending: 'bg-gray-100 text-gray-600 border-gray-200',
  success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  failed:  'bg-red-100 text-red-600 border-red-200',
  skipped: 'bg-amber-100 text-amber-700 border-amber-200',
};

export default function JobDetail() {
  const { id } = useParams();
  const [job, setJob]       = useState(null);
  const [editing, setEditing] = useState(false);
  const [rows, setRows]     = useState([]);
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
    <div className="flex items-center gap-3 text-gray-400 p-8">
      <Loader2 className="w-5 h-5 animate-spin" /> Loading job…
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

  const cfg = STATUS_CFG[job.status] || STATUS_CFG.draft;
  const StatusIcon = cfg.icon;

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6 max-w-6xl">

      {/* Back */}
      <motion.div variants={fadeUp}>
        <Link to="/bulk-update" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" /> New Bulk Update
        </Link>
      </motion.div>

      {/* Header card */}
      <motion.div variants={fadeUp} className={`rounded-2xl border p-5 sm:p-6 ${cfg.card}`}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 bg-white rounded-xl shadow-sm flex items-center justify-center flex-shrink-0">
              <Globe className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">{job.site?.name}</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {job.site?.siteUrl} ·{' '}
                <span className="font-mono text-indigo-600">{job.site?.detectedPlugin}</span>
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </span>
                <span className="text-xs text-gray-500">
                  {job.totalRows} rows · <span className="text-emerald-600 font-medium">{job.successCount} success</span> · <span className="text-red-500 font-medium">{job.failedCount} failed</span>
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
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
                    >
                      <X className="w-3.5 h-3.5" /> Cancel
                    </button>
                    <button
                      onClick={saveRows}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-gray-800 rounded-xl hover:bg-gray-700 transition"
                    >
                      <Save className="w-3.5 h-3.5" /> Save Edits
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit Rows
                  </button>
                )}
                <motion.button
                  onClick={runJob}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl shadow-md shadow-indigo-200 hover:shadow-indigo-300 transition-shadow"
                >
                  <Play className="w-3.5 h-3.5" /> Run Bulk Update
                </motion.button>
              </>
            )}
            {job.status === 'completed' && (
              <>
                <button
                  onClick={downloadReport}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
                >
                  <Download className="w-3.5 h-3.5" /> Download Report
                </button>
                <motion.button
                  onClick={rollback}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition"
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
              className="mt-4 pt-4 border-t border-blue-200"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Running… auto-refreshing every 2s
                </span>
                <span className="text-sm font-bold text-blue-700">{progress}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                <motion.div
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full"
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
      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-800">{rows.length} rows</h2>
          {editing && (
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
              Editing mode
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80">
                {['Post URL', 'Meta Title', 'Meta Description', 'Status'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 max-w-[200px]">
                    <a
                      href={r.postUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 hover:text-indigo-700 truncate block text-xs"
                    >
                      {r.postUrl}
                    </a>
                  </td>
                  <td className="px-4 py-3 max-w-[220px]">
                    {editing ? (
                      <input
                        value={r.newTitle || ''}
                        onChange={(e) => updateRow(i, 'newTitle', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-400 bg-white"
                      />
                    ) : (
                      <span className="text-xs text-gray-700 line-clamp-2">{r.newTitle}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-[280px]">
                    {editing ? (
                      <input
                        value={r.newDescription || ''}
                        onChange={(e) => updateRow(i, 'newDescription', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-400 bg-white"
                      />
                    ) : (
                      <span className="text-xs text-gray-500 line-clamp-2">{r.newDescription}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${ROW_STATUS[r.status] || ROW_STATUS.pending}`}>
                      {r.status}
                    </span>
                    {r.error && (
                      <p className="flex items-center gap-1 text-xs text-red-500 mt-1">
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
