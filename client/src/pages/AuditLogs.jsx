import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, ChevronDown, Globe, ArrowRight, RotateCcw, Edit3, Megaphone, X, User, Filter, Loader2, RefreshCw } from 'lucide-react';
import api from '../api/axios';

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.04 } } };
const fadeUp  = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } };

const LIMIT = 20;

function ActionBadge({ action }) {
  const isRollback = action === 'rollback';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
      isRollback
        ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/25'
        : 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/25'
    }`}>
      {isRollback ? <RotateCcw className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
      {action}
    </span>
  );
}

function timeAgo(d) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000), hours = Math.floor(diff / 3600000), days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now'; if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`; return `${days}d ago`;
}

function FilterSelect({ icon: Icon, value, onChange, children, placeholder }) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="pl-8 pr-8 py-2 border border-gray-200 bg-gray-50 text-gray-700 rounded-xl text-xs appearance-none focus:outline-none focus:border-indigo-400 focus:bg-white transition-all font-medium min-w-[140px] dark:border-white/10 dark:bg-white/[0.06] dark:text-gray-200 dark:focus:border-indigo-500/60 dark:focus:bg-white/[0.08]">
        <option value="" className="bg-white dark:bg-[#0f0f2a] text-gray-400">{placeholder}</option>
        {children}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
    </div>
  );
}

export default function AuditLogs() {
  const [logs,        setLogs]        = useState([]);
  const [sites,       setSites]       = useState([]);
  const [performers,  setPerformers]  = useState([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [betaDismissed, setBetaDismissed] = useState(() => sessionStorage.getItem('betaDismissed') === '1');

  const [siteId,       setSiteId]       = useState('');
  const [performer,    setPerformer]    = useState('');
  const [fieldFilter,  setFieldFilter]  = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const activeFilters = [siteId, performer, fieldFilter, actionFilter].filter(Boolean).length;

  useEffect(() => {
    api.get('/sites').then((r) => setSites(r.data));
    api.get('/audit/performers').then((r) => setPerformers(r.data));
  }, []);

  const fetchLogs = useCallback(async (pg, append = false) => {
    if (!append) setLoading(true); else setLoadingMore(true);
    const params = { page: pg, limit: LIMIT };
    if (siteId)       params.siteId      = siteId;
    if (performer)    params.performedBy = performer;
    if (fieldFilter)  params.field       = fieldFilter;
    if (actionFilter) params.action      = actionFilter;
    try {
      const { data } = await api.get('/audit', { params });
      setTotal(data.total);
      setLogs((prev) => append ? [...prev, ...data.logs] : data.logs);
    } finally {
      if (!append) setLoading(false); else setLoadingMore(false);
    }
  }, [siteId, performer, fieldFilter, actionFilter]);

  useEffect(() => { setPage(1); fetchLogs(1, false); }, [fetchLogs]);

  const loadMore = () => { const next = page + 1; setPage(next); fetchLogs(next, true); };
  const resetFilters = () => { setSiteId(''); setPerformer(''); setFieldFilter(''); setActionFilter(''); };
  const dismissBeta = () => { sessionStorage.setItem('betaDismissed', '1'); setBetaDismissed(true); };
  const hasMore = logs.length < total;

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-5 max-w-6xl">

      {/* Beta banner */}
      <AnimatePresence>
        {!betaDismissed && (
          <motion.div key="beta" variants={fadeUp} exit={{ opacity: 0, y: -10, height: 0, marginBottom: 0 }}
            className="relative overflow-hidden rounded-2xl border border-indigo-200 bg-indigo-50 dark:border-indigo-500/30 dark:bg-gradient-to-r dark:from-indigo-500/10 dark:via-violet-500/10 dark:to-indigo-500/10">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent" />
            <div className="flex items-start sm:items-center gap-3 px-5 py-4">
              <div className="w-8 h-8 bg-indigo-100 border border-indigo-200 dark:bg-indigo-500/20 dark:border-indigo-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                <Megaphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center px-2 py-0.5 bg-indigo-100 border border-indigo-200 dark:bg-indigo-500/20 dark:border-indigo-500/30 rounded-md text-[10px] font-bold text-indigo-600 dark:text-indigo-300 uppercase tracking-wider">Beta</span>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">This tool is in active beta</p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  You're one of the first users. Expect rough edges — and please report anything broken or missing. Your feedback directly shapes what gets built next.
                  <a href="mailto:feedback@digranknow.com" className="ml-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium underline underline-offset-2 transition-colors">Send feedback →</a>
                </p>
              </div>
              <button onClick={dismissBeta} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-indigo-100 dark:hover:text-gray-300 dark:hover:bg-white/10 transition flex-shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Audit Log</h1>
            <span className="inline-flex items-center px-2 py-0.5 bg-indigo-100 border border-indigo-200 dark:bg-indigo-500/15 dark:border-indigo-500/25 rounded-md text-[10px] font-bold text-indigo-600 dark:text-indigo-300 uppercase tracking-wider">Beta</span>
          </div>
          <p className="text-gray-400 text-sm mt-1">
            Full history of every SEO change made across all sites.
            {total > 0 && <span className="ml-2 text-gray-400">{total.toLocaleString()} total entries</span>}
          </p>
        </div>
        <button onClick={() => { setPage(1); fetchLogs(1, false); }}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 rounded-xl hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:bg-white/[0.04] dark:border-white/10 dark:hover:bg-white/[0.08] dark:hover:text-gray-200 transition">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </motion.div>

      {/* Filter bar */}
      <motion.div variants={fadeUp} className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 dark:bg-white/[0.04] dark:border-white/10">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 mr-1">
            <Filter className="w-3.5 h-3.5" /> Filters
          </div>
          <FilterSelect icon={Globe} value={siteId} onChange={setSiteId} placeholder="All sites">
            {sites.map((s) => <option key={s._id} value={s._id} className="bg-white dark:bg-[#0f0f2a] text-gray-900 dark:text-white">{s.name}</option>)}
          </FilterSelect>
          <FilterSelect icon={User} value={performer} onChange={setPerformer} placeholder="All users">
            {performers.map((u) => <option key={u._id} value={u._id} className="bg-white dark:bg-[#0f0f2a] text-gray-900 dark:text-white">{u.email}</option>)}
          </FilterSelect>
          <FilterSelect icon={Filter} value={fieldFilter} onChange={setFieldFilter} placeholder="All fields">
            <option value="title"       className="bg-white dark:bg-[#0f0f2a] text-gray-900 dark:text-white">Title only</option>
            <option value="description" className="bg-white dark:bg-[#0f0f2a] text-gray-900 dark:text-white">Description only</option>
            <option value="both"        className="bg-white dark:bg-[#0f0f2a] text-gray-900 dark:text-white">Both fields</option>
          </FilterSelect>
          <FilterSelect icon={Edit3} value={actionFilter} onChange={setActionFilter} placeholder="All actions">
            <option value="update"   className="bg-white dark:bg-[#0f0f2a] text-gray-900 dark:text-white">Updates</option>
            <option value="rollback" className="bg-white dark:bg-[#0f0f2a] text-gray-900 dark:text-white">Rollbacks</option>
          </FilterSelect>
          {activeFilters > 0 && (
            <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} onClick={resetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 dark:text-red-400 dark:bg-red-500/10 dark:border-red-500/20 dark:hover:bg-red-500/15 transition">
              <X className="w-3 h-3" /> Clear {activeFilters} filter{activeFilters > 1 ? 's' : ''}
            </motion.button>
          )}
          {!loading && (
            <span className="ml-auto text-xs text-gray-400 font-medium whitespace-nowrap">
              Showing {logs.length} of {total.toLocaleString()}
            </span>
          )}
        </div>
      </motion.div>

      {/* Table */}
      <motion.div variants={fadeUp} className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden dark:bg-white/[0.05] dark:backdrop-blur-xl dark:border-white/10 dark:shadow-none">
        {loading ? (
          <div className="divide-y divide-gray-50 dark:divide-white/[0.04]">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-4 animate-pulse">
                <div className="w-8 h-8 bg-gray-100 dark:bg-white/[0.06] rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-100 dark:bg-white/[0.06] rounded w-1/4" />
                  <div className="h-3 bg-gray-50 dark:bg-white/[0.04] rounded w-2/3" />
                </div>
                <div className="h-6 w-16 bg-gray-100 dark:bg-white/[0.06] rounded-full" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-center px-6">
            <div className="w-12 h-12 bg-gray-100 border border-gray-200 dark:bg-white/[0.05] dark:border-white/10 rounded-2xl flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-gray-400" />
            </div>
            <p className="font-bold text-gray-900 dark:text-white">
              {activeFilters > 0 ? 'No entries match your filters' : 'No audit entries yet'}
            </p>
            <p className="text-sm text-gray-400 max-w-xs">
              {activeFilters > 0 ? 'Try clearing some filters to see more results.' : 'Run your first bulk update and all changes will appear here.'}
            </p>
            {activeFilters > 0 && (
              <button onClick={resetFilters} className="mt-1 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold transition-colors">
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-white/[0.06]">
                    {['When', 'Site', 'Post URL', 'Field', 'Change', 'Action', 'By'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap bg-gray-50/80 dark:bg-white/[0.02]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-white/[0.04]">
                  {logs.map((log, i) => (
                    <motion.tr key={log._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.02, 0.3) }}
                      className="hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-300">{timeAgo(log.createdAt)}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{new Date(log.createdAt).toLocaleString()}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">{log.site?.name}</span>
                      </td>
                      <td className="px-4 py-3 max-w-[180px]">
                        <a href={log.postUrl} target="_blank" rel="noreferrer"
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 truncate flex items-center gap-1 max-w-full transition-colors">
                          <span className="truncate">{log.postUrl}</span>
                          <ArrowRight className="w-3 h-3 flex-shrink-0" />
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono bg-gray-100 dark:bg-white/[0.08] text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-md whitespace-nowrap border border-gray-200 dark:border-white/[0.06]">
                          {log.field}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <div className="space-y-1">
                          <div className="flex items-start gap-1.5">
                            <span className="text-[10px] font-bold text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0">OLD</span>
                            <span className="text-xs text-red-500 dark:text-red-400/70 line-through truncate">{log.oldValue || '∅'}</span>
                          </div>
                          <div className="flex items-start gap-1.5">
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0">NEW</span>
                            <span className="text-xs text-emerald-700 dark:text-emerald-300 truncate">{log.newValue || '∅'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap"><ActionBadge action={log.action} /></td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-400 whitespace-nowrap">{log.performedBy?.email || '—'}</span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Load more */}
            <div className="px-5 py-4 border-t border-gray-100 dark:border-white/[0.06] flex items-center justify-between gap-4">
              <p className="text-xs text-gray-400">
                Showing <span className="text-gray-700 dark:text-gray-300 font-semibold">{logs.length}</span> of{' '}
                <span className="text-gray-700 dark:text-gray-300 font-semibold">{total.toLocaleString()}</span> entries
              </p>
              {hasMore && (
                <motion.button onClick={loadMore} disabled={loadingMore} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 dark:text-indigo-300 dark:bg-indigo-500/10 dark:border-indigo-500/25 dark:hover:bg-indigo-500/15 disabled:opacity-50 transition">
                  {loadingMore ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…</> : <>Load {Math.min(LIMIT, total - logs.length)} more entries</>}
                </motion.button>
              )}
              {!hasMore && total > LIMIT && <span className="text-xs text-gray-400">All entries loaded</span>}
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
