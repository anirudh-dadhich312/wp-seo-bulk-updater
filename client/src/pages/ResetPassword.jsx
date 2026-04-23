import { useState, useRef, useCallback, Suspense, lazy } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
} from 'framer-motion';
import { Lock, Eye, EyeOff, Zap, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
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

function FloatingInput({ label, icon: Icon, type = 'text', value, onChange, required, autoComplete, rightElement }) {
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
        className="peer w-full pl-10 pr-10 pt-6 pb-2 bg-transparent rounded-xl text-gray-900 text-sm focus:outline-none"
      />
      <label
        className={`absolute left-10 pointer-events-none transition-all duration-200 origin-left ${
          active ? 'top-2 text-[11px] font-semibold text-indigo-500' : 'top-1/2 -translate-y-1/2 text-sm text-gray-400'
        }`}
      >
        {label}
      </label>
      {rightElement && (
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{rightElement}</div>
      )}
    </div>
  );
}

export default function ResetPassword() {
  const { token } = useParams();
  const nav = useNavigate();
  const { resetPassword } = useAuth();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showCf, setShowCf] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

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
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
      setTimeout(() => nav('/'), 2500);
    } catch (err) {
      setError(err.response?.data?.error || 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  const match = confirm.length > 0 && password === confirm;
  const mismatch = confirm.length > 0 && password !== confirm;

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
            New password.
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Fresh start.
            </span>
          </h2>
          <p className="text-gray-400 text-sm xl:text-base max-w-sm leading-relaxed">
            Choose a strong new password and get back to managing your SEO at scale.
          </p>
        </motion.div>
      </div>

      {/* ── Right Form Panel ───────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center min-h-screen lg:min-h-0 p-5 sm:p-8 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 relative overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.7, 0.5] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-100 rounded-full blur-3xl pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.35, 0.55, 0.35] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute -bottom-24 -left-24 w-80 h-80 bg-indigo-100 rounded-full blur-3xl pointer-events-none"
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
          className="relative w-full max-w-sm sm:max-w-md bg-white/75 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-emerald-100/50 border border-white/80 p-7 sm:p-9 z-10"
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
            {done ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative z-10 flex flex-col items-center text-center space-y-4 py-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 14 }}
                  className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center"
                >
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                </motion.div>
                <h2 className="text-2xl font-bold text-gray-900">Password updated!</h2>
                <p className="text-sm text-gray-500">Redirecting you to the dashboard…</p>
                <div className="w-8 h-1 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full">
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 2.4, ease: 'linear' }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full origin-left"
                    style={{ width: '100%' }}
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                variants={stagger}
                initial="hidden"
                animate="visible"
                className="relative z-10 space-y-5"
              >
                <motion.div variants={fadeUp}>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Set new password 🔒</h1>
                  <p className="text-sm text-gray-500 mt-1">Make sure it's at least 6 characters</p>
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
                      label="New password"
                      icon={Lock}
                      type={showPw ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      rightElement={
                        <button
                          type="button"
                          onClick={() => setShowPw((s) => !s)}
                          className="text-gray-400 hover:text-indigo-500 transition-colors"
                          tabIndex={-1}
                        >
                          {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      }
                    />
                  </motion.div>

                  <motion.div variants={fadeUp}>
                    <FloatingInput
                      label="Confirm password"
                      icon={Lock}
                      type={showCf ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                      rightElement={
                        <button
                          type="button"
                          onClick={() => setShowCf((s) => !s)}
                          className="text-gray-400 hover:text-indigo-500 transition-colors"
                          tabIndex={-1}
                        >
                          {showCf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      }
                    />
                    <AnimatePresence>
                      {mismatch && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="mt-1.5 text-xs text-red-500 pl-1"
                        >
                          Passwords don't match
                        </motion.p>
                      )}
                      {match && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="mt-1.5 text-xs text-emerald-500 pl-1 flex items-center gap-1"
                        >
                          <CheckCircle className="w-3 h-3" /> Passwords match
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  <motion.div variants={fadeUp}>
                    <motion.button
                      type="submit"
                      disabled={loading || mismatch}
                      whileHover={{ scale: 1.015, boxShadow: '0 8px 30px rgba(16,185,129,0.3)' }}
                      whileTap={{ scale: 0.975 }}
                      className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold py-3 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 transition-shadow"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Updating…
                        </>
                      ) : (
                        <>
                          Update Password <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </motion.button>
                  </motion.div>
                </form>

                <motion.div variants={fadeUp} className="text-center">
                  <Link
                    to="/login"
                    className="text-sm text-gray-500 hover:text-indigo-600 transition-colors"
                  >
                    ← Back to sign in
                  </Link>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
