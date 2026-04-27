import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function AcceptInvite() {
  const { token } = useParams();
  const nav = useNavigate();
  const { login } = useAuth();

  const [invite,   setInvite]   = useState(null);
  const [invalid,  setInvalid]  = useState(false);
  const [name,     setName]     = useState('');
  const [password, setPassword] = useState('');
  const [show,     setShow]     = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState('');

  useEffect(() => {
    api.get(`/auth/invite/${token}`)
      .then((r) => { setInvite(r.data); setName(r.data.name || ''); })
      .catch(() => setInvalid(true))
      .finally(() => setLoading(false));
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setSaving(true);
    try {
      const { data } = await api.post(`/auth/accept-invite/${token}`, { name, password });
      localStorage.setItem('token', data.token);
      window.location.href = '/';
    } catch (e) {
      setErr(e.response?.data?.error || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#07071a]">
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#07071a] p-4">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-white/[0.05] dark:backdrop-blur-xl border border-gray-100 dark:border-white/10 rounded-2xl shadow-xl p-8 space-y-6">

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <p className="text-sm font-bold text-gray-900 dark:text-white">SEO Bulk Updater</p>
        </div>

        {invalid ? (
          <div className="text-center space-y-3 py-4">
            <div className="w-12 h-12 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <p className="font-semibold text-gray-900 dark:text-white">Invite link expired</p>
            <p className="text-sm text-gray-400">This invite link is invalid or has expired. Please ask your admin to send a new one.</p>
          </div>
        ) : (
          <>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Accept your invite</h1>
              <p className="text-sm text-gray-400 mt-1">
                You've been invited to join <span className="font-semibold text-gray-700 dark:text-gray-200">{invite?.organization}</span> as <span className="font-medium">{invite?.email}</span>
              </p>
            </div>

            {err && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />{err}
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Your name</label>
                <input value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.05] rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="Full name" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Set password</label>
                <div className="relative">
                  <input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                    className="w-full px-3.5 py-2.5 pr-10 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.05] rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    placeholder="At least 6 characters" />
                  <button type="button" onClick={() => setShow(!show)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={saving}
                className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-shadow disabled:opacity-60">
                {saving ? 'Activating…' : 'Activate account'}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}
