import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, User, Lock, FileText, ArrowLeft, Save, AlertCircle, CheckCircle, Info } from 'lucide-react';
import api from '../api/axios';

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
const fadeUp  = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } };

function FloatingInput({ label, icon: Icon, type = 'text', value, onChange, required, hint, as: As = 'input', rows }) {
  const [focused, setFocused] = useState(false);
  const active = focused || (value && value.length > 0);

  return (
    <div className="space-y-1.5">
      <div className={`relative flex items-start rounded-xl border-2 transition-all duration-200 ${
        focused
          ? 'border-indigo-500 bg-white shadow-lg shadow-indigo-100/50 dark:bg-white/[0.08] dark:shadow-indigo-500/10'
          : 'border-gray-200 bg-gray-50/80 hover:border-gray-300 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/20'
      }`}>
        <Icon className={`absolute left-3.5 top-4 w-4 h-4 transition-colors ${focused ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-400'}`} />
        {As === 'textarea' ? (
          <textarea rows={rows || 3} required={required} value={value} onChange={onChange}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholder=" "
            className="w-full pl-10 pr-4 pt-6 pb-2 bg-transparent rounded-xl text-gray-900 dark:text-white text-sm focus:outline-none resize-none placeholder-transparent" />
        ) : (
          <input type={type} required={required} value={value} onChange={onChange}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholder=" "
            className="w-full pl-10 pr-4 pt-6 pb-2 bg-transparent rounded-xl text-gray-900 dark:text-white text-sm focus:outline-none placeholder-transparent" />
        )}
        <label className={`absolute left-10 pointer-events-none transition-all duration-200 ${
          active ? 'top-2 text-[11px] font-semibold text-indigo-500 dark:text-indigo-400' : 'top-4 text-sm text-gray-400'
        }`}>
          {label}
        </label>
      </div>
      {hint && (
        <p className="flex items-start gap-1.5 text-xs text-gray-400 pl-1">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-indigo-400" />
          {hint}
        </p>
      )}
    </div>
  );
}

export default function SiteForm() {
  const { id } = useParams();
  const nav    = useNavigate();
  const [form, setForm]       = useState({ name: '', siteUrl: '', username: '', appPassword: '', notes: '' });
  const [err, setErr]         = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) api.get(`/sites/${id}`).then((r) => setForm({ ...r.data, appPassword: '' }));
  }, [id]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setLoading(true);
    try {
      if (id) await api.put(`/sites/${id}`, form);
      else    await api.post('/sites', form);
      setSuccess(true);
      setTimeout(() => nav('/sites'), 900);
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to save site');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-xl space-y-6">
      <motion.div variants={fadeUp}>
        <Link to="/sites" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to sites
        </Link>
      </motion.div>

      <motion.div variants={fadeUp}>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          {id ? 'Edit Site' : 'Add Client Site'}
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          {id ? 'Update the site connection details below.' : 'Connect a WordPress site to start bulk updating SEO.'}
        </p>
      </motion.div>

      <motion.div variants={fadeUp} className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 sm:p-8 dark:bg-white/[0.05] dark:backdrop-blur-2xl dark:border-white/10 dark:shadow-none">
        <AnimatePresence mode="wait">
          {err && (
            <motion.div key="err" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-5 flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-xl dark:bg-red-500/10 dark:border-red-500/25">
              <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-red-700 dark:text-red-300">{err}</span>
            </motion.div>
          )}
          {success && (
            <motion.div key="ok" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="mb-5 flex items-center gap-2.5 p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl dark:bg-emerald-500/10 dark:border-emerald-500/25">
              <CheckCircle className="w-4 h-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
              <span className="text-sm text-emerald-700 dark:text-emerald-300">Site saved! Redirecting…</span>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={submit} className="space-y-4">
          <FloatingInput label="Site Name"    icon={Globe} value={form.name}     onChange={set('name')}     required />
          <FloatingInput label="Site URL"     icon={Globe} value={form.siteUrl}  onChange={set('siteUrl')}  required />
          <FloatingInput label="WP Username"  icon={User}  value={form.username} onChange={set('username')} required />
          <FloatingInput
            label={id ? 'App Password (leave blank to keep current)' : 'Application Password'}
            icon={Lock} type="password" value={form.appPassword} onChange={set('appPassword')} required={!id}
            hint="Generate in WP Admin → Users → Profile → Application Passwords"
          />
          <FloatingInput label="Notes (optional)" icon={FileText} as="textarea" rows={3} value={form.notes || ''} onChange={set('notes')} />

          <div className="pt-2 flex items-center gap-4">
            <motion.button type="submit" disabled={loading || success}
              whileHover={{ scale: 1.015, boxShadow: '0 8px 30px rgba(99,102,241,0.3)' }} whileTap={{ scale: 0.975 }}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold px-6 py-2.5 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25 transition-shadow text-sm">
              {loading ? (
                <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Saving…</>
              ) : (
                <><Save className="w-4 h-4" /> Save Site</>
              )}
            </motion.button>
            <p className="text-xs text-gray-400">Plugin auto-detected on save.</p>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
