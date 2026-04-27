import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, User, MessageSquare, Zap, ArrowLeft, CheckCircle, AlertCircle, Send } from 'lucide-react';
import api from '../api/axios';

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

function FloatingInput({ label, icon: Icon, type = 'text', value, onChange, required, as: As = 'input', rows }) {
  const [focused, setFocused] = useState(false);
  const active = focused || value.length > 0;

  return (
    <div className={`relative flex items-start rounded-xl border-2 transition-all duration-200 ${
      focused
        ? 'border-indigo-500 bg-white shadow-lg shadow-indigo-100/60'
        : 'border-gray-200 bg-gray-50/80 hover:border-gray-300'
    }`}>
      <Icon className={`absolute left-3.5 top-4 w-4 h-4 transition-colors duration-200 ${focused ? 'text-indigo-500' : 'text-gray-400'}`} />
      {As === 'textarea' ? (
        <textarea
          rows={rows || 3}
          required={required}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder=" "
          className="peer w-full pl-10 pr-4 pt-6 pb-2 bg-transparent rounded-xl text-gray-900 text-sm focus:outline-none resize-none"
        />
      ) : (
        <input
          type={type}
          required={required}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder=" "
          className="peer w-full pl-10 pr-4 pt-6 pb-2 bg-transparent rounded-xl text-gray-900 text-sm focus:outline-none"
        />
      )}
      <label className={`absolute left-10 pointer-events-none transition-all duration-200 origin-left ${
        active ? 'top-2 text-[11px] font-semibold text-indigo-500' : 'top-4 text-sm text-gray-400'
      }`}>
        {label}
      </label>
    </div>
  );
}

export default function RequestAccess() {
  const [form, setForm]     = useState({ name: '', email: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [done, setDone]     = useState(false);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/invite-requests', form);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5 sm:p-8 bg-gradient-to-br from-slate-50 via-white to-violet-50/40 relative overflow-hidden">
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.6, 0.4] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-24 -right-24 w-64 h-64 bg-violet-100 rounded-full blur-3xl pointer-events-none"
      />
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute -bottom-24 -left-24 w-80 h-80 bg-indigo-100 rounded-full blur-3xl pointer-events-none"
      />

      <div className="absolute top-5 left-5 flex items-center gap-2">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md shadow-indigo-200">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-bold text-gray-800">SEO Bulk Updater</span>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 32 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-sm sm:max-w-md bg-white/80 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-violet-100/50 border border-white/80 p-7 sm:p-9 z-10"
      >
        <AnimatePresence mode="wait">
          {done ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4 space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Request sent!</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Your access request has been submitted. The workspace admin will review it and send you an invite link if approved.
              </p>
              <div className="pt-2 flex flex-col gap-3">
                <Link
                  to="/login"
                  className="block w-full text-center bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold py-3 rounded-xl text-sm shadow-lg shadow-violet-200"
                >
                  Back to Sign In
                </Link>
                <p className="text-xs text-gray-400">We'll send the invite to <strong className="text-gray-600">{form.email}</strong></p>
              </div>
            </motion.div>
          ) : (
            <motion.div key="form" variants={stagger} initial="hidden" animate="visible" className="space-y-5">
              <motion.div variants={fadeUp}>
                <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-indigo-600 transition-colors mb-4">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
                </Link>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Request Access</h1>
                <p className="text-sm text-gray-500 mt-1">Submit your details and an admin will send you an invite.</p>
              </motion.div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-xl"
                  >
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-red-700 leading-snug">{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={submit} className="space-y-4">
                <motion.div variants={fadeUp}>
                  <FloatingInput label="Full name" icon={User} value={form.name} onChange={update('name')} required />
                </motion.div>
                <motion.div variants={fadeUp}>
                  <FloatingInput label="Email address" icon={Mail} type="email" value={form.email} onChange={update('email')} required />
                </motion.div>
                <motion.div variants={fadeUp}>
                  <FloatingInput
                    label="Message (optional)"
                    icon={MessageSquare}
                    as="textarea"
                    rows={3}
                    value={form.message}
                    onChange={update('message')}
                  />
                </motion.div>

                <motion.div variants={fadeUp}>
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.015, boxShadow: '0 8px 30px rgba(124,58,237,0.35)' }}
                    whileTap={{ scale: 0.975 }}
                    className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold py-3 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-violet-200 transition-shadow"
                  >
                    {loading ? (
                      <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Sending…</>
                    ) : (
                      <><Send className="w-4 h-4" /> Send Request</>
                    )}
                  </motion.button>
                </motion.div>
              </form>

              <motion.p variants={fadeUp} className="text-center text-sm text-gray-500">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
                  Sign in
                </Link>
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
