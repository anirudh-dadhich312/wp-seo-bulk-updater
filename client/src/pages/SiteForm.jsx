import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, User, Lock, FileText, ArrowLeft, Save, AlertCircle, CheckCircle,
  Info, Download, Puzzle, ArrowRight, ExternalLink, ShieldAlert, ShieldCheck,
  Loader2, RefreshCw,
} from 'lucide-react';
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

function PluginStep({ onConfirm }) {
  const [confirmed, setConfirmed] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch('/api/plugin/download');
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = 'seo-bulk-updater-bridge.zip';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Download failed. Please contact support.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-xl space-y-6">
      <motion.div variants={fadeUp}>
        <Link to="/app/sites" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to sites
        </Link>
      </motion.div>

      <motion.div variants={fadeUp}>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Add Client Site</h1>
        <p className="text-gray-400 text-sm mt-1">Before connecting, install the bridge plugin on your WordPress site.</p>
      </motion.div>

      <motion.div variants={fadeUp} className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 sm:p-8 dark:bg-white/[0.05] dark:backdrop-blur-2xl dark:border-white/10">
        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">1</div>
            <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">Install Plugin</span>
          </div>
          <div className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-white/10 text-gray-400 text-xs flex items-center justify-center font-bold">2</div>
            <span className="text-sm text-gray-400">Site Details</span>
          </div>
        </div>

        <div className="flex items-start gap-4 p-4 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <Puzzle className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">SEO Bulk Updater Bridge</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              This WordPress plugin allows our platform to securely read and update SEO metadata on your site.
              It works with Yoast SEO, Rank Math, and AIOSEO.
            </p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Installation steps:</p>
          {[
            'Download the plugin zip file using the button below',
            'In your WordPress admin, go to Plugins → Add New → Upload Plugin',
            'Upload the zip file and click "Install Now"',
            'Activate the plugin — it requires no configuration',
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                {i + 1}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{step}</p>
            </div>
          ))}
        </div>

        <motion.button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.975 }}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold py-3 rounded-xl mb-6 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25 transition-shadow text-sm"
        >
          {downloading ? (
            <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Preparing download…</>
          ) : (
            <><Download className="w-4 h-4" /> Download Plugin (.zip)</>
          )}
        </motion.button>

        <label className="flex items-start gap-3 cursor-pointer group mb-6">
          <div className="relative mt-0.5">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="sr-only"
            />
            <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
              confirmed
                ? 'bg-indigo-600 border-indigo-600'
                : 'border-gray-300 dark:border-white/20 group-hover:border-indigo-400'
            }`}>
              {confirmed && <CheckCircle className="w-3.5 h-3.5 text-white" />}
            </div>
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            I have downloaded, installed, and activated the <span className="font-semibold text-gray-900 dark:text-white">SEO Bulk Updater Bridge</span> plugin on my WordPress site.
          </span>
        </label>

        <motion.button
          type="button"
          onClick={onConfirm}
          disabled={!confirmed}
          whileHover={confirmed ? { scale: 1.015 } : {}}
          whileTap={confirmed ? { scale: 0.975 } : {}}
          className="w-full flex items-center justify-center gap-2 bg-gray-900 dark:bg-white dark:text-gray-900 text-white font-semibold py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm"
        >
          Continue to Site Details <ArrowRight className="w-4 h-4" />
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

/* ── App Password reason → human-readable help ───────────── */
const APP_PWD_REASONS = {
  version_too_old: {
    title: 'WordPress version too old',
    color: 'red',
    steps: [
      'Application Passwords were added in WordPress 5.6 (Dec 2020).',
      'Go to Dashboard → Updates → and update WordPress to the latest version.',
      'After updating, the Application Passwords section will appear in Users → Profile.',
    ],
  },
  no_ssl: {
    title: 'HTTPS / SSL is required',
    color: 'amber',
    steps: [
      'WordPress disables Application Passwords on non-HTTPS sites by default.',
      'Option 1: Enable SSL on your hosting (most hosts provide free SSL certificates).',
      'Option 2: For local dev only, add to wp-config.php: define("WP_ENVIRONMENT_TYPE", "local");',
    ],
  },
  disabled: {
    title: 'Application Passwords disabled by a plugin or custom code',
    color: 'amber',
    steps: [
      'A security plugin or custom code filter has turned off Application Passwords.',
      'Check Wordfence → Login Security → "Disable Application Passwords".',
      'Check iThemes Security → Settings → search "Application Passwords".',
      'Check All-In-One WP Security → User Accounts for a similar toggle.',
      'Or search your theme/plugin files for: wp_is_application_passwords_available',
    ],
  },
};

function WpInfoBanner({ info, onRecheck, checking }) {
  if (!info) return null;
  const { wpVersion, appPasswordsAvailable, appPasswordReason } = info;
  const reason = APP_PWD_REASONS[appPasswordReason];

  return (
    <AnimatePresence>
      <motion.div
        key="wpinfo"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="space-y-3"
      >
        {/* Version + availability pill row */}
        <div className="flex flex-wrap items-center gap-2">
          {wpVersion && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-white/[0.08] text-slate-600 dark:text-slate-300">
              WordPress {wpVersion}
            </span>
          )}
          {appPasswordsAvailable ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="w-3 h-3" /> Application Passwords available
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400">
              <ShieldAlert className="w-3 h-3" /> Application Passwords unavailable
            </span>
          )}
          <button
            type="button"
            onClick={onRecheck}
            disabled={checking}
            className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-indigo-500 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-3 h-3 ${checking ? 'animate-spin' : ''}`} />
            Re-check
          </button>
        </div>

        {/* Detailed warning when not available */}
        {!appPasswordsAvailable && reason && (
          <div className={`p-4 rounded-xl border ${
            reason.color === 'red'
              ? 'bg-red-50 border-red-100 dark:bg-red-500/10 dark:border-red-500/20'
              : 'bg-amber-50 border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20'
          }`}>
            <div className="flex items-start gap-2.5">
              <ShieldAlert className={`w-4 h-4 flex-shrink-0 mt-0.5 ${reason.color === 'red' ? 'text-red-500' : 'text-amber-500'}`} />
              <div className="flex-1">
                <p className={`text-sm font-semibold ${reason.color === 'red' ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
                  {reason.title}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {reason.steps.map((step, i) => (
                    <li key={i} className={`text-xs leading-relaxed flex gap-2 ${reason.color === 'red' ? 'text-red-600/80 dark:text-red-400/70' : 'text-amber-700/80 dark:text-amber-400/70'}`}>
                      <span className="font-bold flex-shrink-0">{i + 1}.</span>
                      <span className="whitespace-pre-line">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Unknown state — REST root not reachable */}
        {!appPasswordsAvailable && !reason && (
          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] text-xs text-gray-500 dark:text-gray-400">
            Could not reach the WordPress REST API at this URL. Make sure the URL is correct, the site is online, and the REST API is not blocked by a firewall or security plugin.
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export default function SiteForm() {
  const { id } = useParams();
  const nav    = useNavigate();

  const [step, setStep] = useState(id ? 'form' : 'plugin');

  const [form, setForm]       = useState({ name: '', siteUrl: '', username: '', appPassword: '', notes: '' });
  const [err, setErr]         = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // WP detection state
  const [wpInfo, setWpInfo]       = useState(null);
  const [checking, setChecking]   = useState(false);
  const debounceRef               = useRef(null);

  useEffect(() => {
    if (id) api.get(`/sites/${id}`).then((r) => setForm({ ...r.data, appPassword: '' }));
  }, [id]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Auto-detect WP info when URL changes (debounced)
  const runCheck = async (url) => {
    if (!url || !url.startsWith('http')) return;
    setChecking(true);
    try {
      const { data } = await api.post('/sites/check-wp', { siteUrl: url });
      setWpInfo(data);
    } catch (_) {
      setWpInfo(null);
    } finally {
      setChecking(false);
    }
  };

  const onUrlChange = (e) => {
    const val = e.target.value;
    setForm((f) => ({ ...f, siteUrl: val }));
    setWpInfo(null);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runCheck(val), 900);
  };

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setLoading(true);
    try {
      if (id) await api.put(`/sites/${id}`, form);
      else    await api.post('/sites', form);
      setSuccess(true);
      setTimeout(() => nav('/app/sites'), 900);
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to save site');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'plugin') return <PluginStep onConfirm={() => setStep('form')} />;

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-xl space-y-6">
      <motion.div variants={fadeUp}>
        <Link to="/app/sites" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors">
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

      {/* Step indicator — only shown when adding */}
      {!id && (
        <motion.div variants={fadeUp} className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center font-bold">
              <CheckCircle className="w-3.5 h-3.5" />
            </div>
            <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Plugin Installed</span>
          </div>
          <div className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">2</div>
            <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">Site Details</span>
          </div>
        </motion.div>
      )}

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
          <FloatingInput label="Site Name"   icon={Globe} value={form.name}    onChange={set('name')}    required />

          {/* URL field with inline checking spinner */}
          <div className="space-y-1.5">
            <div className="relative">
              <FloatingInput
                label="Site URL"
                icon={Globe}
                value={form.siteUrl}
                onChange={onUrlChange}
                required
              />
              {checking && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                </div>
              )}
            </div>
            <WpInfoBanner
              info={wpInfo}
              checking={checking}
              onRecheck={() => runCheck(form.siteUrl)}
            />
          </div>

          <FloatingInput label="WP Username" icon={User} value={form.username} onChange={set('username')} required />
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
            {!id && (
              <button type="button" onClick={() => setStep('plugin')}
                className="text-xs text-gray-400 hover:text-indigo-500 transition-colors">
                ← Back to plugin step
              </button>
            )}
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
