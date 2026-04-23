import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Globe, Briefcase, Plus, ArrowRight, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

const STATUS_CONFIG = {
  completed: { label: 'Completed', color: 'text-emerald-600 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500', icon: CheckCircle },
  running:   { label: 'Running',   color: 'text-blue-600 bg-blue-50 border-blue-200',     dot: 'bg-blue-500 animate-pulse', icon: Loader2 },
  failed:    { label: 'Failed',    color: 'text-red-600 bg-red-50 border-red-200',         dot: 'bg-red-500',   icon: XCircle },
  draft:     { label: 'Draft',     color: 'text-gray-600 bg-gray-50 border-gray-200',      dot: 'bg-gray-400',  icon: Clock },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

const STAT_CARDS = (sites, jobs) => [
  {
    label: 'Client Sites',
    value: sites,
    icon: Globe,
    link: '/sites',
    gradient: 'from-indigo-500 to-violet-600',
    bg: 'bg-indigo-50',
    text: 'text-indigo-600',
    desc: 'Active WordPress sites',
  },
  {
    label: 'Total Jobs',
    value: jobs,
    icon: Briefcase,
    link: '/bulk-update',
    gradient: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-50',
    text: 'text-violet-600',
    desc: 'Bulk update jobs run',
  },
];

export default function Dashboard() {
  const [stats, setStats] = useState({ sites: 0, jobs: 0, recent: [] });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    Promise.all([api.get('/sites'), api.get('/jobs')])
      .then(([sites, jobs]) =>
        setStats({ sites: sites.data.length, jobs: jobs.data.length, recent: jobs.data.slice(0, 5) })
      )
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-8 max-w-6xl">

      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Link
            to="/bulk-update"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-shadow"
          >
            <Plus className="w-4 h-4" /> New Bulk Update
          </Link>
        </motion.div>
      </motion.div>

      {/* Stat cards */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {STAT_CARDS(stats.sites, stats.jobs).map((card) => (
          <Link key={card.label} to={card.link}>
            <motion.div
              whileHover={{ y: -2, boxShadow: '0 12px 40px rgba(99,102,241,0.12)' }}
              className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm cursor-pointer group transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{card.label}</p>
                  <p className="text-4xl font-bold text-gray-900 mt-1.5 tabular-nums">
                    {loading ? <span className="text-gray-300 animate-pulse">—</span> : card.value}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{card.desc}</p>
                </div>
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-md flex-shrink-0`}>
                  <card.icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className={`mt-4 flex items-center gap-1 text-xs font-medium ${card.text} opacity-0 group-hover:opacity-100 transition-opacity`}>
                View all <ArrowRight className="w-3 h-3" />
              </div>
            </motion.div>
          </Link>
        ))}
      </motion.div>

      {/* Recent Jobs */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Recent Jobs</h2>
          <Link to="/bulk-update" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
            New job <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="divide-y divide-gray-50">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-4 flex items-center gap-4 animate-pulse">
                  <div className="w-9 h-9 bg-gray-100 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-gray-100 rounded w-1/3" />
                    <div className="h-3 bg-gray-50 rounded w-1/2" />
                  </div>
                  <div className="h-6 w-20 bg-gray-100 rounded-full" />
                </div>
              ))}
            </div>
          ) : stats.recent.length === 0 ? (
            <div className="py-14 flex flex-col items-center gap-3 text-center px-6">
              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-700 font-medium">No jobs yet</p>
              <p className="text-sm text-gray-400 max-w-xs">Start your first bulk update to see job history here.</p>
              <Link
                to="/bulk-update"
                className="mt-1 text-sm text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1"
              >
                Create a job <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {stats.recent.map((job, i) => (
                <motion.div
                  key={job._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    to={`/jobs/${job._id}`}
                    className="flex items-center gap-4 p-4 hover:bg-gray-50/70 transition-colors group"
                  >
                    <div className="w-9 h-9 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Briefcase className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 truncate text-sm">
                        {job.site?.name || 'Unknown site'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {job.totalRows} rows · {job.successCount} success · {job.failedCount} failed
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <StatusBadge status={job.status} />
                      <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400 transition-colors" />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
