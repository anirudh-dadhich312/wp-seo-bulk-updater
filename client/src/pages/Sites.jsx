import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Globe, Plus, Pencil, Trash2, RefreshCw, ArrowRight, ExternalLink } from 'lucide-react';
import api from '../api/axios';

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };
const fadeUp  = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } };

const PLUGIN_CFG = {
  yoast:    { label: 'Yoast SEO', color: 'bg-purple-500/15 text-purple-300 border-purple-500/25' },
  rankmath: { label: 'Rank Math', color: 'bg-blue-500/15 text-blue-300 border-blue-500/25' },
  aioseo:   { label: 'AIOSEO',    color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25' },
  generic:  { label: 'Generic',   color: 'bg-gray-500/15 text-gray-400 border-gray-500/25' },
  unknown:  { label: 'Unknown',   color: 'bg-amber-500/15 text-amber-300 border-amber-500/25' },
};

function PluginBadge({ plugin }) {
  const cfg = PLUGIN_CFG[plugin] || PLUGIN_CFG.unknown;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${cfg.color}`}>
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
    `radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,0.06) 0%, transparent 65%)`
  );

  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    rotX.set(((e.clientY - r.top)  / r.height - 0.5) * -14);
    rotY.set(((e.clientX - r.left) / r.width  - 0.5) *  14);
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

function SiteCard({ site, busy, onRedetect, onDelete }) {
  return (
    <TiltCard>
      <motion.div
        variants={fadeUp}
        layout
        className="bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col gap-4 hover:border-white/20 transition-colors"
      >
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Globe className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white truncate leading-tight">{site.name}</p>
            <a
              href={site.siteUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-gray-400 hover:text-indigo-400 flex items-center gap-1 mt-0.5 transition-colors truncate"
            >
              {site.siteUrl} <ExternalLink className="w-3 h-3 flex-shrink-0" />
            </a>
          </div>
          <PluginBadge plugin={site.detectedPlugin} />
        </div>

        {/* Notes */}
        {site.notes && (
          <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 border-t border-white/[0.06] pt-3">
            {site.notes}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1 border-t border-white/[0.06]">
          <button
            onClick={() => onRedetect(site._id)}
            disabled={busy === site._id}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${busy === site._id ? 'animate-spin' : ''}`} />
            {busy === site._id ? 'Detecting…' : 'Redetect'}
          </button>
          <Link
            to={`/sites/${site._id}/edit`}
            className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={() => onDelete(site._id)}
            className="w-9 h-9 flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </TiltCard>
  );
}

export default function Sites() {
  const [sites,   setSites]   = useState([]);
  const [busy,    setBusy]    = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => api.get('/sites').then((r) => setSites(r.data)).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const redetect = async (id) => {
    setBusy(id);
    try { await api.post(`/sites/${id}/redetect`); await load(); }
    finally { setBusy(null); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this site? This cannot be undone.')) return;
    await api.delete(`/sites/${id}`);
    load();
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6 max-w-6xl">

      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Client Sites</h1>
          <p className="text-gray-400 text-sm mt-1">{sites.length} site{sites.length !== 1 ? 's' : ''} connected</p>
        </div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Link
            to="/sites/new"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-shadow"
          >
            <Plus className="w-4 h-4" /> Add Site
          </Link>
        </motion.div>
      </motion.div>

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/[0.06] rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/[0.06] rounded w-3/4" />
                  <div className="h-3 bg-white/[0.04] rounded w-1/2" />
                </div>
              </div>
              <div className="h-9 bg-white/[0.04] rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      <AnimatePresence>
        {!loading && sites.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-2xl py-16 flex flex-col items-center text-center gap-3 px-6"
          >
            <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center">
              <Globe className="w-7 h-7 text-indigo-400" />
            </div>
            <p className="font-bold text-white text-lg">No sites yet</p>
            <p className="text-sm text-gray-400 max-w-xs">Add your first WordPress site to start bulk updating SEO metadata.</p>
            <Link to="/sites/new" className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-indigo-400 hover:text-indigo-300">
              Add your first site <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      {!loading && sites.length > 0 && (
        <motion.div variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {sites.map((site) => (
            <SiteCard key={site._id} site={site} busy={busy} onRedetect={redetect} onDelete={remove} />
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
