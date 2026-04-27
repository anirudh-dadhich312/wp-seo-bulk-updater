import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Trash2, X, AlertCircle, UserCheck,
  UserPlus, ChevronDown, Copy, Check, UserMinus,
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

/* ─── Custom select ─────────────────────────────────────────── */
function CustomSelect({ value, onChange, options, placeholder = 'Select…' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.05] rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-colors"
      >
        <span className={selected ? 'text-gray-900 dark:text-white' : 'text-gray-400'}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-full z-50 bg-white dark:bg-[#1c1c3a] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-52 overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3.5 py-2.5 text-sm transition-colors flex items-center justify-between
                ${opt.value === value
                  ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.06]'}`}
            >
              {opt.label}
              {opt.value === value && <Check className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Create Team modal ─────────────────────────────────────── */
function CreateTeamModal({ users, onClose, onCreate }) {
  const [name,     setName]     = useState('');
  const [leaderId, setLeaderId] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [err,      setErr]      = useState('');

  const leaderOptions = [
    { value: '', label: '— assign later —' },
    ...users
      .filter((u) => ['admin', 'team_leader', 'team_member'].includes(u.role))
      .map((u) => ({ value: u._id, label: u.name || u.email })),
  ];

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setLoading(true);
    try {
      await api.post('/teams', { name, leaderId: leaderId || undefined });
      onCreate(); onClose();
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to create team');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white dark:bg-[#12122a] border border-gray-100 dark:border-white/10 rounded-2xl shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Create Team</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X className="w-5 h-5" /></button>
        </div>
        {err && <p className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400"><AlertCircle className="w-4 h-4" />{err}</p>}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Team name *</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Content Team"
              className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.05] rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Team leader</label>
            <CustomSelect value={leaderId} onChange={setLeaderId} options={leaderOptions} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/[0.06] rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 transition">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl shadow-md shadow-indigo-500/20 disabled:opacity-60">
              {loading ? 'Creating…' : 'Create Team'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/* ─── Invite modal ──────────────────────────────────────────── */
function InviteModal({ meRole, onClose, onInvited }) {
  const [form,    setForm]    = useState({ email: '', name: '', role: roleOptions.length === 1 ? roleOptions[0].value : '' });
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState('');
  const [result,  setResult]  = useState(null);
  const [copied,  setCopied]  = useState(false);

  const roleOptions = meRole === 'super_admin'
    ? [
        { value: 'team_member', label: 'Team Member' },
        { value: 'team_leader', label: 'Team Leader' },
        { value: 'admin',       label: 'Admin' },
      ]
    : meRole === 'admin'
    ? [
        { value: 'team_member', label: 'Team Member' },
        { value: 'team_leader', label: 'Team Leader' },
      ]
    : [{ value: 'team_member', label: 'Team Member' }];

  const submit = async (e) => {
    e.preventDefault();
    if (!form.role) { setErr('Please select a role before sending the invite.'); return; }
    setErr(''); setLoading(true);
    try {
      const { data } = await api.post('/users/invite', form);
      setResult(data.inviteUrl); onInvited();
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
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X className="w-5 h-5" /></button>
        </div>
        {result ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-xl text-sm text-emerald-700 dark:text-emerald-400">
              <Check className="w-4 h-4 flex-shrink-0" /> Invite created! Share this link:
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 truncate">{result}</code>
              <button onClick={copy}
                className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <button onClick={onClose} className="w-full py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/[0.06] rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 transition">Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {err && <p className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400"><AlertCircle className="w-4 h-4" />{err}</p>}
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Email *</label>
              <input type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.05] rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.05] rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors" />
            </div>
            {roleOptions.length > 1 && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Role *</label>
                <CustomSelect value={form.role} onChange={(v) => setForm((f) => ({ ...f, role: v }))} options={roleOptions} />
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/[0.06] rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 transition">Cancel</button>
              <button type="submit" disabled={loading} className="flex-1 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl shadow-md shadow-indigo-500/20 disabled:opacity-60">
                {loading ? 'Inviting…' : 'Send Invite'}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}

/* ─── Member row ────────────────────────────────────────────── */
function MemberRow({ member, isLeader, canRemove, onRemove, removing }) {
  const initials = (member.name || member.email || '?')[0].toUpperCase();
  return (
    <div className="flex items-center gap-2.5 py-2 px-1 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors group">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate leading-tight">
          {member.name || member.email?.split('@')[0]}
          {isLeader && (
            <span className="ml-1.5 inline-flex items-center gap-0.5 text-[9px] font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wide">
              <UserCheck className="w-2.5 h-2.5" />Leader
            </span>
          )}
        </p>
        <p className="text-[10px] text-gray-400 truncate">{member.email}</p>
      </div>
      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
        member.status === 'active'
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
          : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
      }`}>
        {member.status || 'active'}
      </span>
      {canRemove && !isLeader && (
        <button
          onClick={() => onRemove(member._id)}
          disabled={removing === member._id}
          title="Remove from team"
          className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-500/10 transition opacity-0 group-hover:opacity-100 flex-shrink-0 disabled:opacity-40"
        >
          <UserMinus className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────── */
export default function TeamManagement() {
  const { user: me } = useAuth();
  const [teams,      setTeams]      = useState([]);
  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [removing,   setRemoving]   = useState(null);  // team delete
  const [removingMember, setRemovingMember] = useState(null); // member remove

  const load = () =>
    Promise.all([api.get('/teams'), api.get('/users')])
      .then(([t, u]) => { setTeams(t.data); setUsers(u.data); })
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const deleteTeam = async (id) => {
    if (!window.confirm('Delete this team? Members will be unassigned.')) return;
    setRemoving(id);
    try { await api.delete(`/teams/${id}`); await load(); } finally { setRemoving(null); }
  };

  const removeMember = async (teamId, memberId) => {
    setRemovingMember(memberId);
    try {
      await api.put(`/teams/${teamId}`, { removeMemberIds: [memberId] });
      await load();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to remove member');
    } finally {
      setRemovingMember(null);
    }
  };

  const canCreate = ['super_admin', 'admin'].includes(me?.role);
  const canInvite = ['super_admin', 'admin', 'team_leader'].includes(me?.role);

  const canManageTeam = (team) => {
    if (['super_admin', 'admin'].includes(me?.role)) return true;
    // team_leader can manage only their own team
    return me?.role === 'team_leader' && String(team.leader?._id || team.leader) === String(me?._id);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-5xl">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Teams</h1>
          <p className="text-gray-400 text-sm mt-1">{teams.length} team{teams.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          {canInvite && (
            <button onClick={() => setShowInvite(true)}
              className="inline-flex items-center gap-2 border border-indigo-500/40 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
              <UserPlus className="w-4 h-4" /> Invite Member
            </button>
          )}
          {canCreate && (
            <button onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-500/25">
              <Plus className="w-4 h-4" /> New Team
            </button>
          )}
        </div>
      </div>

      {/* Team cards */}
      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-white dark:bg-white/[0.05] border border-gray-100 dark:border-white/10 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : teams.length === 0 ? (
        <div className="bg-white dark:bg-white/[0.05] dark:backdrop-blur-xl border border-gray-100 dark:border-white/10 rounded-2xl py-16 flex flex-col items-center gap-3 text-center px-6">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl flex items-center justify-center">
            <Users className="w-6 h-6 text-indigo-500" />
          </div>
          <p className="font-bold text-gray-900 dark:text-white">No teams yet</p>
          <p className="text-sm text-gray-400">Create a team to organize your members and control site access.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {teams.map((team) => {
            const canManage = canManageTeam(team);
            const leaderIdStr = String(team.leader?._id || team.leader || '');

            return (
              <motion.div key={team._id} layout
                className="bg-white dark:bg-white/[0.05] dark:backdrop-blur-xl border border-gray-100 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm dark:shadow-none">

                {/* Team header */}
                <div className="flex items-start justify-between gap-2 p-5 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-100 dark:border-indigo-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">{team.name}</p>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">
                        {team.members?.length || 0} member{(team.members?.length || 0) !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  {canCreate && (
                    <button onClick={() => deleteTeam(team._id)} disabled={removing === team._id}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-500/10 transition flex-shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Members list */}
                <div className="px-4 pb-4">
                  <div className="border-t border-gray-100 dark:border-white/[0.06] pt-3 space-y-0.5">
                    {(team.members || []).length === 0 ? (
                      <p className="text-xs text-gray-400 italic py-2 text-center">No members assigned</p>
                    ) : (
                      (team.members || []).map((m) => (
                        <MemberRow
                          key={m._id}
                          member={m}
                          isLeader={String(m._id) === leaderIdStr}
                          canRemove={canManage}
                          onRemove={(memberId) => removeMember(team._id, memberId)}
                          removing={removingMember}
                        />
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {showCreate && (
          <CreateTeamModal users={users} onClose={() => setShowCreate(false)} onCreate={load} />
        )}
        {showInvite && (
          <InviteModal meRole={me?.role} onClose={() => setShowInvite(false)} onInvited={load} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
