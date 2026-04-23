import { useState, useRef, useCallback, Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
} from 'framer-motion';
import { Mail, Zap, ArrowRight, ArrowLeft, AlertCircle, CheckCircle, Copy, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Scene3D = lazy(() => import('../components/auth/Scene3D'));

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

function FloatingInput({ label, icon: Icon, type = 'text', value, onChange, required, autoComplete }) {
  const [focused, setFocused] = useState(false);
  const active = focused || value.length > 0;

  return (
    <div
      className={`relative flex items-center rounded-xl border-2 transition-all duration-200 ${
        focused
          ? 'border-indigo-500 bg-white shadow-lg shadow-indigo-100/60'
          : 'border-gray-200 bg-gray-50/80 hover:border-gray-300'
      }`}
    >
      <Icon
        className={`absolute left-3.5 w-4 h-4 transition-colors duration-200 ${
          focused ? 'text-indigo-500' : 'text-gray-400'
        }`}
      />
      <input
        type={type}
        required={required}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder=" "
        className="peer w-full pl-10 pr-4 pt-6 pb-2 bg-transparent rounded-xl text-gray-900 text-sm focus:outline-none"
      />
      <label
        className={`absolute left-10 pointer-events-none transition-all duration-200 origin-left ${
          active ? 'top-2 text-[11px] font-semibold text-indigo-500' : 'top-1/2 -translate-y-1/2 text-sm text-gray-400'
        }`}
      >
        {label}
      </label>
    </div>
  );
}

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetData, setResetData] = useState(null);
  const [copied, setCopied] = useState(false);
  const { forgotPassword } = useAuth();

  /* 3D card tilt */
  const cardRef = useRef(null);
  const rotX = useMotionValue(0);
  const rotY = useMotionValue(0);
  const springX = useSpring(rotX, { stiffness: 200, damping: 22 });
  const springY = useSpring(rotY, { stiffness: 200, damping: 22 });
  const glossX = useTransform(springY, [-12, 12], ['0%', '100%']);
  const glossY = useTransform(springX, [-12, 12], ['0%', '100%']);

  const onMouseMove = useCallback(
    (e) => {
      const r = cardRef.current?.getBoundingClientRect();
      if (!r) return;
      rotX.set(((e.clientY - r.top) / r.height - 0.5) * -22);
      rotY.set(((e.clientX - r.left) / r.width - 0.5) * 22);
    },
    [rotX, rotY]
  );
  const onMouseLeave = useCallback(() => { rotX.set(0); rotY.set(0); }, [rotX, rotY]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await forgotPassword(email);
      setResetData(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetUrl = resetData?.resetUrl
    ? `${window.location.origin}${resetData.resetUrl}`
    : null;

  const copyLink = async () => {
    if (!resetUrl) return;
    await navigator.clipboard.writeText(resetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ── Left 3D Panel ─────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden bg-[#07071a]">
        <div className="absolute inset-0">
          <Suspense fallback={null}>
            <Scene3D />
          </Suspense>
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-indigo-950/30 pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 flex flex-col justify-end p-10 xl:p-14 pb-14 w-full"
        >
          <div className="flex items-center gap-3 mb-7">
            <div className="w-10 h-10 bg-indigo-500/20 backdrop-blur-md border border-indigo-400/30 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-indigo-300" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">SEO Bulk Updater</span>
          </div>
          <h2 className="text-4xl xl:text-5xl font-bold text-white mb-4 leading-tight">
            Locked out?
            <br />
            <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              We've got you.
            </span>
          </h2>
          <p className="text-gray-400 text-sm xl:text-base max-w-sm leading-relaxed">
            Enter your email and we'll send you a secure link to reset your password instantly.
          </p>
        </motion.div>
      </div>

      {/* ── Right Form Panel ───────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center min-h-screen lg:min-h-0 p-5 sm:p-8 bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 relative overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.7, 0.5] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-100 rounded-full blur-3xl pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.35, 0.55, 0.35] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute -bottom-24 -left-24 w-80 h-80 bg-cyan-100 rounded-full blur-3xl pointer-events-none"
        />

        <div className="absolute top-5 left-5 flex lg:hidden items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md shadow-indigo-200">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-gray-800">SEO Bulk Updater</span>
        </div>

        <motion.div
          ref={cardRef}
          style={{ rotateX: springX, rotateY: springY, transformPerspective: 1200 }}
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          initial={{ opacity: 0, scale: 0.93, y: 32 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-sm sm:max-w-md bg-white/75 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-indigo-100/50 border border-white/80 p-7 sm:p-9 z-10"
        >
          <motion.div
            style={{
              background: useTransform(
                [glossX, glossY],
                ([gx, gy]) =>
                  `radial-gradient(circle at ${gx} ${gy}, rgba(255,255,255,0.22), transparent 65%)`
              ),
            }}
            className="absolute inset-0 rounded-3xl pointer-events-none"
          />

          <AnimatePresence mode="wait">
            {!resetData ? (
              /* ── Request form ── */
              <motion.div
                key="form"
                variants={stagger}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: -10 }}
                className="relative z-10 space-y-5"
              >
                <motion.div variants={fadeUp}>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Reset password 🔑</h1>
                  <p className="text-sm text-gray-500 mt-1">Enter your email to receive a reset link</p>
                </motion.div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-xl"
                  >
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-red-700 leading-snug">{error}</span>
                  </motion.div>
                )}

                <form onSubmit={submit} className="space-y-4">
                  <motion.div variants={fadeUp}>
                    <FloatingInput
                      label="Email address"
                      icon={Mail}
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </motion.div>

                  <motion.div variants={fadeUp}>
                    <motion.button
                      type="submit"
                      disabled={loading}
                      whileHover={{ scale: 1.015, boxShadow: '0 8px 30px rgba(99,102,241,0.35)' }}
                      whileTap={{ scale: 0.975 }}
                      className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold py-3 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 transition-shadow"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Sending…
                        </>
                      ) : (
                        <>
                          Send Reset Link <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </motion.button>
                  </motion.div>
                </form>

                <motion.div variants={fadeUp} className="text-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
                  </Link>
                </motion.div>
              </motion.div>
            ) : (
              /* ── Success state ── */
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-10 space-y-5"
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.1 }}
                    className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center"
                  >
                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                  </motion.div>
                  <h2 className="text-2xl font-bold text-gray-900">Link ready!</h2>
                  <p className="text-sm text-gray-500">
                    {resetUrl
                      ? 'Use the link below to reset your password. It expires in 1 hour.'
                      : resetData.message}
                  </p>
                </div>

                {resetUrl && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                      Reset link
                    </p>
                    <p className="text-xs text-indigo-600 break-all leading-relaxed font-mono">{resetUrl}</p>
                    <motion.button
                      onClick={copyLink}
                      whileTap={{ scale: 0.95 }}
                      className="mt-3 w-full flex items-center justify-center gap-2 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all"
                    >
                      {copied ? (
                        <><Check className="w-4 h-4 text-emerald-500" /> Copied!</>
                      ) : (
                        <><Copy className="w-4 h-4" /> Copy link</>
                      )}
                    </motion.button>
                  </div>
                )}

                <Link
                  to="/login"
                  className="block text-center text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  ← Back to sign in
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
