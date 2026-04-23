import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  Globe, Briefcase, Plus, ArrowRight, CheckCircle, XCircle,
  Clock, Loader2, TrendingUp, BarChart2, Zap,
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };
const fadeUp  = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } } };

const STATUS_CFG = {
  completed: { label: 'Completed', badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25', dot: 'bg-emerald-400',            icon: CheckCircle },
  running:   { label: 'Running',   badge: 'bg-blue-500/15 text-blue-300 border-blue-500/25',         dot: 'bg-blue-400 animate-pulse', icon: Loader2 },
  failed:    { label: 'Failed',    badge: 'bg-red-500/15 text-red-300 border-red-500/25',             dot: 'bg-red-400',               icon: XCircle },
  draft:     { label: 'Draft',     badge: 'bg-gray-500/15 text-gray-400 border-gray-500/25',          dot: 'bg-gray-500',              icon: Clock },
};

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

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function TiltCard({ children, className = '' }) {
  const ref = useRef();
  const rotX = useMotionValue(0);
  const rotY = useMotionValue(0);
  const sX   = useSpring(rotX, { stiffness: 220, damping: 26 });
  const sY   = useSpring(rotY, { stiffness: 220, damping: 26 });
  const gX   = useMotionValue(50);
  const gY   = useMotionValue(50);
  const glossBg = useTransform([gX, gY], ([x, y]) =>
    `radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,0.07) 0%, transparent 65%)`
  );

  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    rotX.set(((e.clientY - r.top)  / r.height - 0.5) * -16);
    rotY.set(((e.clientX - r.left) / r.width  - 0.5) *  16);
    gX.set(((e.clientX - r.left) / r.width)  * 100);
    gY.set(((e.clientY - r.top)  / r.height) * 100);
  };
  const onLeave = () => { rotX.set(0); rotY.set(0); gX.set(50); gY.set(50); };

  return (
    <motion.div
      ref={ref}
      style={{ rotateX: sX, rotateY: sY, transformPerspective: 900 }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`relative ${className}`}
    >
      <motion.div style={{ background: glossBg }} className="absolute inset-0 rounded-2xl pointer-events-none z-10" />
      {children}
    </motion.div>
  );
}

export default function Dashboard() {
  const [stats,   setStats]   = useState({ sites: 0, jobs: 0, successRate: 0, avgRows: 0, recent: [], last7: [] });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    Promise.all([api.get('/sites'), api.get('/jobs')])
      .then(([s, j]) => {
        const jobs  = j.data;
        const done  = jobs.filter((x) => x.status === 'completed');
        const totalRows    = done.reduce((a, x) => a + (x.totalRows    || 0), 0);
        const totalSuccess = done.reduce((a, x) => a + (x.successCount || 0), 0);
        setStats({
          sites:       s.data.length,
          jobs:        jobs.length,
          successRate: totalRows > 0 ? Math.round((totalSuccess / totalRows) * 100) : 0,
          avgRows:     done.length > 0 ? Math.round(totalRows / done.length) : 0,
          recent:      jobs.slice(0, 6),
          last7:       jobs.slice(0, 7).reverse(),
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';

  const STAT_CARDS = [
    { label: 'Client Sites',   value: stats.sites,       icon: Globe,       grad: 'from-indigo-500 to-indigo-700', glow: 'shadow-indigo-500/30', desc: 'Connected sites',          link: '/sites' },
    { label: 'Total Jobs',     value: stats.jobs,        icon: Briefcase,   grad: 'from-violet-500 to-violet-700', glow: 'shadow-violet-500/30', desc: 'Bulk update jobs',         link: '/bulk-update' },
    { label: 'Success Rate',   value: `${stats.successRate}%`, icon: TrendingUp,  grad: 'from-emerald-500 to-emerald-700', glow: 'shadow-emerald-500/30', desc: 'Rows updated successfully' },
    { label: 'Avg Rows / Job', value: stats.avgRows,     icon: BarChart2,   grad: 'from-blue-500 to-blue-700',    glow: 'shadow-blue-500/30',   desc: 'Rows per completed job' },
  ];

  const maxRows = Math.max(...stats.last7.map((j) => j.totalRows || 1), 1);

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-8 max-w-6xl">

      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Link
            to="/bulk-update"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-shadow"
          >
            <Plus className="w-4 h-4" /> New Bulk Update
          </Link>
        </motion.div>
      </motion.div>

      {/* Stat cards */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {STAT_CARDS.map((card) => {
          const Inner = (
            <TiltCard>
              <div className="bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-2xl p-5 cursor-default hover:border-white/20 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.grad} flex items-center justify-center shadow-lg ${card.glow} flex-shrink-0`}>
                    <card.icon className="w-5 h-5 text-white" />
                  </div>
                  {card.link && (
                    <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
                  )}
                </div>
                <p className="text-3xl font-bold text-white tabular-nums mt-2">
                  {loading ? <span className="text-gray-700 animate-pulse">—</span> : card.value}
                </p>
                <p className="text-sm font-semibold text-gray-300 mt-1">{card.label}</p>
                <p className="text-xs text-gray-600 mt-0.5">{card.desc}</p>
              </div>
            </TiltCard>
          );
          return card.link ? (
            <Link key={card.label} to={card.link} className="group">{Inner}</Link>
          ) : (
            <div key={card.label}>{Inner}</div>
          );
        })}
      </motion.div>

      {/* Bar chart + Recent jobs */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Mini bar chart */}
        <motion.div variants={fadeUp} className="bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <BarChart2 className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Job Activity</p>
              <p className="text-[11px] text-gray-500">Last {stats.last7.length} jobs</p>
            </div>
          </div>

          {loading || stats.last7.length === 0 ? (
            <div className="h-32 flex items-end gap-2">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="flex-1 bg-white/[0.04] rounded-sm animate-pulse" style={{ height: `${20 + i * 10}%` }} />
              ))}
            </div>
          ) : (
            <div className="h-32 flex items-end gap-2">
              {stats.last7.map((job, i) => {
                const pct   = Math.max(((job.totalRows || 0) / maxRows) * 100, 6);
                const sPct  = job.totalRows > 0 ? Math.round((job.successCount / job.totalRows) * 100) : 0;
                return (
                  <div key={job._id} className="flex-1 flex flex-col items-center gap-1.5 group">
                    <div className="w-full bg-white/[0.06] rounded-sm relative" style={{ height: '100%' }}>
                      <motion.div
                        className="absolute bottom-0 w-full rounded-sm bg-gradient-to-t from-indigo-600 to-violet-500"
                        initial={{ height: 0 }}
                        animate={{ height: `${pct}%` }}
                        transition={{ delay: i * 0.06, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                      />
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                        {sPct}% success
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/[0.06]">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-br from-indigo-500 to-violet-500" />
              <span className="text-[11px] text-gray-500">Rows processed</span>
            </div>
          </div>
        </motion.div>

        {/* Recent jobs */}
        <motion.div variants={fadeUp} className="xl:col-span-2 bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-bold text-white">Recent Jobs</h2>
            </div>
            <Link to="/bulk-update" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors">
              New job <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="divide-y divide-white/[0.04]">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-4 flex items-center gap-4 animate-pulse">
                  <div className="w-9 h-9 bg-white/[0.06] rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-white/[0.06] rounded w-1/3" />
                    <div className="h-3 bg-white/[0.04] rounded w-1/2" />
                  </div>
                  <div className="h-6 w-20 bg-white/[0.06] rounded-full" />
                </div>
              ))}
            </div>
          ) : stats.recent.length === 0 ? (
            <div className="py-14 flex flex-col items-center gap-3 text-center px-6">
              <div className="w-12 h-12 bg-white/[0.05] rounded-2xl flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-gray-500" />
              </div>
              <p className="text-gray-300 font-medium">No jobs yet</p>
              <p className="text-sm text-gray-600 max-w-xs">Start your first bulk update to see job history here.</p>
              <Link to="/bulk-update" className="mt-1 text-sm text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1">
                Create a job <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {stats.recent.map((job, i) => (
                <motion.div
                  key={job._id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    to={`/jobs/${job._id}`}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.03] transition-colors group"
                  >
                    <div className="w-9 h-9 bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Briefcase className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-200 truncate text-sm">{job.site?.name || 'Unknown site'}</p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {job.totalRows} rows · <span className="text-emerald-500">{job.successCount} ok</span> · <span className="text-red-400">{job.failedCount} fail</span>
                        <span className="ml-2 text-gray-700">· {timeAgo(job.createdAt)}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <StatusBadge status={job.status} />
                      <ArrowRight className="w-3.5 h-3.5 text-gray-700 group-hover:text-gray-400 transition-colors" />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
