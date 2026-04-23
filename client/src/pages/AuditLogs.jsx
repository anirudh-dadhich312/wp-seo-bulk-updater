import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, ChevronDown, Globe, ArrowRight, RotateCcw, Edit3 } from 'lucide-react';
import api from '../api/axios';

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } };
const fadeUp  = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22,1,0.36,1] } } };

function ActionBadge({ action }) {
  const isRollback = action === 'rollback';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
      isRollback
        ? 'bg-amber-100 text-amber-700 border-amber-200'
        : 'bg-blue-100 text-blue-700 border-blue-200'
    }`}>
      {isRollback ? <RotateCcw className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
      {action}
    </span>
  );
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function AuditLogs() {
  const [logs, setLogs]     = useState([]);
  const [sites, setSites]   = useState([]);
  const [siteId, setSiteId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get('/sites').then((r) => setSites(r.data)); }, []);

  useEffect(() => {
    setLoading(true);
    const params = siteId ? { siteId } : {};
    api.get('/audit', { params })
      .then((r) => setLogs(r.data))
      .finally(() => setLoading(false));
  }, [siteId]);

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6 max-w-6xl">

      {/* Header */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-gray-500 text-sm mt-1">Full history of every SEO change made across all sites.</p>
        </div>

        {/* Filter */}
        <div className="relative">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <select
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            className="pl-9 pr-10 py-2.5 border-2 border-gray-200 bg-gray-50 rounded-xl text-sm appearance-none focus:outline-none focus:border-indigo-400 focus:bg-white transition-all font-medium text-gray-700"
          >
            <option value="">All sites</option>
            {sites.map((s) => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </motion.div>

      {/* Table card */}
      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {loading ? (
          <div className="divide-y divide-gray-50">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-4 animate-pulse">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                  <div className="h-3 bg-gray-50 rounded w-2/3" />
                </div>
                <div className="h-6 w-16 bg-gray-100 rounded-full" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-center px-6">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-gray-400" />
            </div>
            <p className="font-bold text-gray-900">No audit entries yet</p>
            <p className="text-sm text-gray-400 max-w-xs">Run your first bulk update and all changes will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  {['When', 'Site', 'Post URL', 'Field', 'Change', 'Action', 'By'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log) => (
                  <motion.tr
                    key={log._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-xs font-semibold text-gray-700">{timeAgo(log.createdAt)}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{new Date(log.createdAt).toLocaleString()}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-gray-700 whitespace-nowrap">{log.site?.name}</span>
                    </td>
                    <td className="px-4 py-3 max-w-[180px]">
                      <a
                        href={log.postUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-indigo-600 hover:text-indigo-700 truncate flex items-center gap-1 max-w-full"
                      >
                        <span className="truncate">{log.postUrl}</span>
                        <ArrowRight className="w-3 h-3 flex-shrink-0" />
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md whitespace-nowrap">
                        {log.field}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[220px]">
                      <div className="space-y-1">
                        <div className="flex items-start gap-1.5">
                          <span className="text-[10px] font-bold text-red-400 mt-0.5 flex-shrink-0">OLD</span>
                          <span className="text-xs text-red-500 line-through truncate">{log.oldValue || '∅'}</span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <span className="text-[10px] font-bold text-emerald-500 mt-0.5 flex-shrink-0">NEW</span>
                          <span className="text-xs text-emerald-700 truncate">{log.newValue || '∅'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <ActionBadge action={log.action} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-400 whitespace-nowrap">{log.performedBy?.email || '—'}</span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
