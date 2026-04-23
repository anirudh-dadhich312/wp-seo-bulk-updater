import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList, ChevronDown, Globe, ArrowRight, RotateCcw, Edit3,
  Megaphone, X, User, Filter, Loader2, RefreshCw,
} from 'lucide-react';
import api from '../api/axios';

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.04 } } };
const fadeUp  = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } };

const LIMIT = 20;

function ActionBadge({ action }) {
  const isRollback = action === 'rollback';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
      isRollback
        ? 'bg-amber-500/15 text-amber-300 border-amber-500/25'
        : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25'
    }`}>
      {isRollback ? <RotateCcw className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
      {action}
    </span>
  );
}

function timeAgo(d) {
  const diff  = Date.now() - new Date(d).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function FilterSelect({ icon: Icon, value, onChange, children, placeholder }) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-8 pr-8 py-2 border border-white/10 bg-white/[0.06] text-gray-200 rounded-xl text-xs appearance-none focus:outline-none focus:border-indigo-500/60 focus:bg-white/[0.08] transition-all font-medium min-w-[140px]"
      >
        <option value="" className="bg-[#0f0f2a] text-gray-400">{placeholder}</option>
        {children}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
    </div>
  );
}

export default function AuditLogs() {
  const [logs,       setLogs]       = useState([]);
  const [sites,      setSites]      = useState([]);
  const [performers, setPerformers] = useState([]);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [betaDismissed, setBetaDismissed] = useState(() => sessionStorage.getItem('betaDismissed') === '1');

  // filters
  const [siteId,      setSiteId]      = useState('');
  const [performer,   setPerformer]   = useState('');
  const [fieldFilter, setFieldFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const activeFilters = [siteId, performer, fieldFilter, actionFilter].filter(Boolean).length;

  // load sites + performers once
  useEffect(() => {
    api.get('/sites').then((r) => setSites(r.data));
    api.get('/audit/performers').then((r) => setPerformers(r.data));
  }, []);

  // reload from page 1 when any filter changes
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

  useEffect(() => {
    setPage(1);
    fetchLogs(1, false);
  }, [fetchLogs]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchLogs(next, true);
  };

  const resetFilters = () => {
    setSiteId(''); setPerformer(''); setFieldFilter(''); setActionFilter('');
  };

  const dismissBeta = () => {
    sessionStorage.setItem('betaDismissed', '1');
    setBetaDismissed(true);
  };

  const hasMore = logs.length < total;

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-5 max-w-6xl">

      {/* Beta banner */}
      <AnimatePresence>
        {!betaDismissed && (
          <motion.div
            key="beta"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-indigo-500/10"
          >
            {/* animated shimmer line */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent" />

            <div className="flex items-start sm:items-center gap-3 px-5 py-4">
              <div className="w-8 h-8 bg-indigo-500/20 border border-indigo-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                <Megaphone className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center px-2 py-0.5 bg-indigo-500/20 border border-indigo-500/30 rounded-md text-[10px] font-bold text-indigo-300 uppercase tracking-wider">
                    Beta
                  </span>
                  <p className="text-sm font-semibold text-white">This tool is in active beta</p>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  You're one of the first users. Expect rough edges — and please report anything broken or missing.
                  Your feedback directly shapes what gets built next.
                  <a
                    href="mailto:feedback@digranknow.com"
                    className="ml-1.5 text-indigo-400 hover:text-indigo-300 font-medium underline underline-offset-2 transition-colors"
                  >
                    Send feedback →
                  </a>
                </p>
              </div>
              <button
                onClick={dismissBeta}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/10 transition flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page header */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Audit Log</h1>
            <span className="inline-flex items-center px-2 py-0.5 bg-indigo-500/15 border border-indigo-500/25 rounded-md text-[10px] font-bold text-indigo-300 uppercase tracking-wider">
              Beta
            </span>
          </div>
          <p className="text-gray-400 text-sm mt-1">
            Full history of every SEO change made across all sites.
            {total > 0 && <span className="ml-2 text-gray-500">{total.toLocaleString()} total entries</span>}
          </p>
        </div>

        {/* Refresh */}
        <button
          onClick={() => { setPage(1); fetchLogs(1, false); }}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-400 bg-white/[0.04] border border-white/10 rounded-xl hover:bg-white/[0.08] hover:text-gray-200 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </motion.div>

      {/* Filter bar */}
      <motion.div variants={fadeUp} className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mr-1">
            <Filter className="w-3.5 h-3.5" /> Filters
          </div>

          <FilterSelect icon={Globe} value={siteId} onChange={setSiteId} placeholder="All sites">
            {sites.map((s) => (
              <option key={s._id} value={s._id} className="bg-[#0f0f2a] text-white">{s.name}</option>
            ))}
          </FilterSelect>

          <FilterSelect icon={User} value={performer} onChange={setPerformer} placeholder="All users">
            {performers.map((u) => (
              <option key={u._id} value={u._id} className="bg-[#0f0f2a] text-white">{u.email}</option>
            ))}
          </FilterSelect>

          <FilterSelect icon={Filter} value={fieldFilter} onChange={setFieldFilter} placeholder="All fields">
            <option value="title"       className="bg-[#0f0f2a] text-white">Title only</option>
            <option value="description" className="bg-[#0f0f2a] text-white">Description only</option>
            <option value="both"        className="bg-[#0f0f2a] text-white">Both fields</option>
          </FilterSelect>

          <FilterSelect icon={Edit3} value={actionFilter} onChange={setActionFilter} placeholder="All actions">
            <option value="update"   className="bg-[#0f0f2a] text-white">Updates</option>
            <option value="rollback" className="bg-[#0f0f2a] text-white">Rollbacks</option>
          </FilterSelect>

          {activeFilters > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500/15 transition"
            >
              <X className="w-3 h-3" /> Clear {activeFilters} filter{activeFilters > 1 ? 's' : ''}
            </motion.button>
          )}

          {/* entry count */}
          {!loading && (
            <span className="ml-auto text-xs text-gray-600 font-medium whitespace-nowrap">
              Showing {logs.length} of {total.toLocaleString()}
            </span>
          )}
        </div>
      </motion.div>

      {/* Table card */}
      <motion.div variants={fadeUp} className="bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">

        {loading ? (
          <div className="divide-y divide-white/[0.04]">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-4 animate-pulse">
                <div className="w-8 h-8 bg-white/[0.06] rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-white/[0.06] rounded w-1/4" />
                  <div className="h-3 bg-white/[0.04] rounded w-2/3" />
                </div>
                <div className="h-6 w-16 bg-white/[0.06] rounded-full" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-center px-6">
            <div className="w-12 h-12 bg-white/[0.05] border border-white/10 rounded-2xl flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-gray-400" />
            </div>
            <p className="font-bold text-white">
              {activeFilters > 0 ? 'No entries match your filters' : 'No audit entries yet'}
            </p>
            <p className="text-sm text-gray-400 max-w-xs">
              {activeFilters > 0
                ? 'Try clearing some filters to see more results.'
                : 'Run your first bulk update and all changes will appear here.'}
            </p>
            {activeFilters > 0 && (
              <button onClick={resetFilters} className="mt-1 text-sm text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {['When', 'Site', 'Post URL', 'Field', 'Change', 'Action', 'By'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap bg-white/[0.02]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {logs.map((log, i) => (
                    <motion.tr
                      key={log._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.02, 0.3) }}
                      className="hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-xs font-semibold text-gray-300">{timeAgo(log.createdAt)}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{new Date(log.createdAt).toLocaleString()}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-gray-300 whitespace-nowrap">{log.site?.name}</span>
                      </td>
                      <td className="px-4 py-3 max-w-[180px]">
                        <a
                          href={log.postUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-indigo-400 hover:text-indigo-300 truncate flex items-center gap-1 max-w-full transition-colors"
                        >
                          <span className="truncate">{log.postUrl}</span>
                          <ArrowRight className="w-3 h-3 flex-shrink-0" />
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono bg-white/[0.08] text-gray-300 px-2 py-0.5 rounded-md whitespace-nowrap border border-white/[0.06]">
                          {log.field}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <div className="space-y-1">
                          <div className="flex items-start gap-1.5">
                            <span className="text-[10px] font-bold text-red-400 mt-0.5 flex-shrink-0">OLD</span>
                            <span className="text-xs text-red-400/70 line-through truncate">{log.oldValue || '∅'}</span>
                          </div>
                          <div className="flex items-start gap-1.5">
                            <span className="text-[10px] font-bold text-emerald-400 mt-0.5 flex-shrink-0">NEW</span>
                            <span className="text-xs text-emerald-300 truncate">{log.newValue || '∅'}</span>
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

            {/* Load more */}
            <div className="px-5 py-4 border-t border-white/[0.06] flex items-center justify-between gap-4">
              <p className="text-xs text-gray-500">
                Showing <span className="text-gray-300 font-semibold">{logs.length}</span> of{' '}
                <span className="text-gray-300 font-semibold">{total.toLocaleString()}</span> entries
              </p>

              {hasMore && (
                <motion.button
                  onClick={loadMore}
                  disabled={loadingMore}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-indigo-300 bg-indigo-500/10 border border-indigo-500/25 rounded-xl hover:bg-indigo-500/15 disabled:opacity-50 transition"
                >
                  {loadingMore ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…</>
                  ) : (
                    <>Load {Math.min(LIMIT, total - logs.length)} more entries</>
                  )}
                </motion.button>
              )}

              {!hasMore && total > LIMIT && (
                <span className="text-xs text-gray-600 font-medium">All entries loaded</span>
              )}
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
