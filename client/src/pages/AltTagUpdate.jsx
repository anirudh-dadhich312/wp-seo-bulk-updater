import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Image, Play, Clock, CheckCircle2, XCircle,
  AlertCircle, ChevronRight, Plus, Globe, Loader2,
} from 'lucide-react';
import api from '../api/axios';

const STATUS_META = {
  scanning:  { label: 'Scanning',   color: 'text-blue-600   dark:text-blue-400',   bg: 'bg-blue-50   dark:bg-blue-500/10',   icon: Loader2,      spin: true  },
  draft:     { label: 'Draft',      color: 'text-amber-600  dark:text-amber-400',  bg: 'bg-amber-50  dark:bg-amber-500/10',  icon: Clock,        spin: false },
  running:   { label: 'Running',    color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10', icon: Play,         spin: false },
  completed: { label: 'Completed',  color: 'text-green-600  dark:text-green-400',  bg: 'bg-green-50  dark:bg-green-500/10',  icon: CheckCircle2, spin: false },
  failed:    { label: 'Failed',     color: 'text-red-600    dark:text-red-400',    bg: 'bg-red-50    dark:bg-red-500/10',    icon: XCircle,      spin: false },
};

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.draft;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${m.color} ${m.bg}`}>
      <Icon className={`w-3 h-3 ${m.spin ? 'animate-spin' : ''}`} />
      {m.label}
    </span>
  );
}

export default function AltTagUpdate() {
  const nav = useNavigate();
  const [sites, setSites]       = useState([]);
  const [jobs, setJobs]         = useState([]);
  const [siteId, setSiteId]     = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    api.get('/sites').then((r) => setSites(r.data)).catch(() => {});
    api.get('/alt-tag-jobs').then((r) => setJobs(r.data)).catch(() => {});
  }, []);

  const startScan = async () => {
    if (!siteId) return setError('Please select a site first.');
    setError('');
    setScanning(true);
    try {
      const { data } = await api.post('/alt-tag-jobs/scan', { siteId });
      nav(`/app/alt-tags/${data._id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start scan.');
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Image Alt Tags</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Scan your WordPress media library and bulk update image alt text for better SEO.
        </p>
      </div>

      {/* New scan card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.08] rounded-2xl p-6"
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/25">
            <Image className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Start a New Scan</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Select a connected site to scan all media attachments and review their current alt text.
            </p>

            {error && (
              <div className="mt-3 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl text-sm text-red-700 dark:text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <select
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/[0.1] bg-gray-50 dark:bg-white/[0.05] text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500"
                >
                  <option value="">Select a site…</option>
                  {sites.map((s) => (
                    <option key={s._id} value={s._id}>{s.name} — {s.siteUrl}</option>
                  ))}
                </select>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={startScan}
                disabled={scanning || !siteId}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {scanning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {scanning ? 'Starting…' : 'Scan Media'}
              </motion.button>
            </div>

            {sites.length === 0 && (
              <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
                No sites connected yet.{' '}
                <Link to="/app/sites/new" className="text-cyan-600 dark:text-cyan-400 hover:underline font-medium">
                  Add a site
                </Link>{' '}
                to get started.
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Past jobs */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Previous Scans</h2>

        {jobs.length === 0 ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-600 text-sm">
            No scans yet — start one above.
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.map((job, i) => (
              <motion.div
                key={job._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link
                  to={`/app/alt-tags/${job._id}`}
                  className="flex items-center gap-4 p-4 bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.07] rounded-xl hover:border-cyan-300 dark:hover:border-cyan-500/30 hover:shadow-sm transition-all group"
                >
                  <div className="w-8 h-8 bg-cyan-50 dark:bg-cyan-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Image className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {job.site?.name || 'Unknown site'}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {job.totalItems} images · {new Date(job.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <StatusBadge status={job.status} />
                    {job.status === 'completed' && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {job.updatedCount}/{job.totalItems} updated
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-cyan-500 transition-colors" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
