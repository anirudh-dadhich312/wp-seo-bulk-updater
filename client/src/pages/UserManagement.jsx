import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, UserPlus, Trash2, Copy, Check, X, ChevronDown, AlertCircle, Shield, Crown, UserCheck, User } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const ROLE_CFG = {
  super_admin:  { label: 'Super Admin',  color: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/25', icon: Crown },
  admin:        { label: 'Admin',        color: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/25', icon: Shield },
  team_leader:  { label: 'Team Leader',  color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/25', icon: UserCheck },
  team_member:  { label: 'Team Member',  color: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-500/15 dark:text-gray-400 dark:border-gray-500/25', icon: User },
  operator:     { label: 'Team Member',  color: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-500/15 dark:text-gray-400 dark:border-gray-500/25', icon: User },
};

const STATUS_COLOR = {
  active:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  invited: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
};

function RoleBadge({ role }) {
  const cfg = ROLE_CFG[role] || ROLE_CFG.team_member;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border ${cfg.color}`}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  );
}

const EDITABLE_ROLES = [
  { value: 'super_admin',  label: 'Super Admin' },
  { value: 'admin',        label: 'Admin' },
  { value: 'team_leader',  label: 'Team Leader' },
  { value: 'team_member',  label: 'Team Member' },
];

function RoleEditor({ userId, currentRole, meRole, meId, onUpdated }) {
  const [open,    setOpen]    = useState(false);
  const [saving,  setSaving]  = useState(false);
  const ref = useRef(null);

  const canEdit = meRole === 'super_admin'
    || (meRole === 'admin' && !['super_admin'].includes(currentRole) && String(userId) !== String(meId));

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const choose = async (role) => {
    if (role === currentRole) { setOpen(false); return; }
    setSaving(true);
    try {
      await api.put(`/users/${userId}`, { role });
      onUpdated();
    } finally {
      setSaving(false);
      setOpen(false);
    }
  };

  if (!canEdit) return <RoleBadge role={currentRole} />;

  const cfg = ROLE_CFG[currentRole] || ROLE_CFG.team_member;
  const Icon = cfg.icon;

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={saving}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border transition hover:opacity-80 ${cfg.color}`}
      >
        <Icon className="w-3 h-3" />
        {cfg.label}
        <ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-36 bg-white dark:bg-[#1a1a35] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden">
          {EDITABLE_ROLES.filter((r) => meRole === 'super_admin' || r.value !== 'super_admin').map((r) => {
            const rc = ROLE_CFG[r.value];
            const RIcon = rc.icon;
            return (
              <button
                key={r.value}
                onClick={() => choose(r.value)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.06] ${r.value === currentRole ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-500/10' : 'text-gray-700 dark:text-gray-300'}`}
              >
                <RIcon className="w-3 h-3" />{r.label}
                {r.value === currentRole && <Check className="w-3 h-3 ml-auto" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InviteModal({ teams, onClose, onInvited }) {
  const [form, setForm] = useState({ email: '', name: '', role: 'team_member', teamId: '' });
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState('');
  const [result,  setResult]  = useState(null);
  const [copied,  setCopied]  = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      const { data } = await api.post('/users/invite', form);
      setResult(data.inviteUrl);
      onInvited();
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to invite user');
    } finally { setLoading(false); }
  };

  const copy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white dark:bg-[#12122a] border border-gray-100 dark:border-white/10 rounded-2xl shadow-2xl p-6 space-y-5">

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Invite Team Member</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {result ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-xl text-sm text-emerald-700 dark:text-emerald-400">
              <Check className="w-4 h-4 flex-shrink-0" /> User invited! Share this link with them:
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 truncate">{result}</code>
              <button onClick={copy}
                className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <button onClick={onClose} className="w-full py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/[0.06] rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 transition">Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {err && <p className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400"><AlertCircle className="w-4 h-4" />{err}</p>}
            {[['Email', 'email', 'email', true], ['Name', 'name', 'text', false]].map(([label, key, type, required]) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{label}{required && ' *'}</label>
                <input type={type} required={required} value={form[key]} onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.05] rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Role *</label>
              <div className="relative">
                <select value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full px-3.5 py-2.5 pr-8 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.05] rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 appearance-none transition-colors">
                  <option value="team_member">Team Member</option>
                  <option value="team_leader">Team Leader</option>
                  <option value="admin">Admin</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            {teams.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Assign to Team</label>
                <div className="relative">
                  <select value={form.teamId} onChange={(e) => setForm(f => ({ ...f, teamId: e.target.value }))}
                    className="w-full px-3.5 py-2.5 pr-8 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.05] rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 appearance-none transition-colors">
                    <option value="">No team</option>
                    {teams.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/[0.06] rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 transition">Cancel</button>
              <button type="submit" disabled={loading} className="flex-1 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl shadow-lg shadow-indigo-500/20 disabled:opacity-60 transition">
                {loading ? 'Inviting…' : 'Send Invite'}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}

export default function UserManagement() {
  const { user: me } = useAuth();
  const [users,       setUsers]       = useState([]);
  const [teams,       setTeams]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showInvite,  setShowInvite]  = useState(false);
  const [removing,    setRemoving]    = useState(null);

  const load = () =>
    Promise.all([api.get('/users'), api.get('/teams')])
      .then(([u, t]) => { setUsers(u.data); setTeams(t.data); })
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    if (!window.confirm('Remove this user? They will lose all access.')) return;
    setRemoving(id);
    try { await api.delete(`/users/${id}`); await load(); } finally { setRemoving(null); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <p className="text-gray-400 text-sm mt-1">{users.length} member{users.length !== 1 ? 's' : ''} in your organization</p>
        </div>
        {['super_admin', 'admin'].includes(me?.role) && (
          <button onClick={() => setShowInvite(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-500/25">
            <UserPlus className="w-4 h-4" /> Invite Member
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-white/[0.05] dark:backdrop-blur-xl border border-gray-100 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm dark:shadow-none">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-gray-100 dark:bg-white/[0.04] rounded-xl animate-pulse" />)}
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-center px-6">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl flex items-center justify-center">
              <Users className="w-6 h-6 text-indigo-500" />
            </div>
            <p className="font-bold text-gray-900 dark:text-white">No team members yet</p>
            <p className="text-sm text-gray-400">Invite someone to get started.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/[0.06] bg-gray-50/80 dark:bg-white/[0.02]">
                {['Member', 'Role', 'Team', 'Status', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-white/[0.04]">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {u.email[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white text-xs truncate">{u.name || '—'}</p>
                        <p className="text-[11px] text-gray-400 truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <RoleEditor
                      userId={u._id}
                      currentRole={u.role}
                      meRole={me?.role}
                      meId={me?._id}
                      onUpdated={load}
                    />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{u.team?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOR[u.status] || ''}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {String(u._id) !== String(me?._id) && !['super_admin'].includes(u.role) && (
                      <button onClick={() => remove(u._id)} disabled={removing === u._id}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-500/10 transition ml-auto">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AnimatePresence>
        {showInvite && (
          <InviteModal teams={teams} onClose={() => setShowInvite(false)} onInvited={() => { load(); }} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
