import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Trash2, X, AlertCircle, UserCheck } from 'lucide-react';
import api from '../api/axios';

function CreateTeamModal({ users, onClose, onCreate }) {
  const [name,     setName]     = useState('');
  const [leaderId, setLeaderId] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [err,      setErr]      = useState('');

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setLoading(true);
    try {
      await api.post('/teams', { name, leaderId: leaderId || undefined });
      onCreate();
      onClose();
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
            <select value={leaderId} onChange={(e) => setLeaderId(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.05] rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 appearance-none transition-colors">
              <option value="">— assign later —</option>
              {users.filter((u) => ['admin', 'team_leader', 'team_member'].includes(u.role)).map((u) => (
                <option key={u._id} value={u._id}>{u.name || u.email}</option>
              ))}
            </select>
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

export default function TeamManagement() {
  const [teams,     setTeams]     = useState([]);
  const [users,     setUsers]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [removing,  setRemoving]  = useState(null);

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

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Teams</h1>
          <p className="text-gray-400 text-sm mt-1">{teams.length} team{teams.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-500/25">
          <Plus className="w-4 h-4" /> New Team
        </button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-40 bg-white dark:bg-white/[0.05] border border-gray-100 dark:border-white/10 rounded-2xl animate-pulse" />)}
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
          {teams.map((team) => (
            <motion.div key={team._id} layout
              className="bg-white dark:bg-white/[0.05] dark:backdrop-blur-xl border border-gray-100 dark:border-white/10 rounded-2xl p-5 shadow-sm dark:shadow-none space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-100 dark:border-indigo-500/20 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{team.name}</p>
                    {team.leader && (
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <UserCheck className="w-3 h-3" />{team.leader.name || team.leader.email}
                      </p>
                    )}
                  </div>
                </div>
                <button onClick={() => deleteTeam(team._id)} disabled={removing === team._id}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-500/10 transition flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="border-t border-gray-100 dark:border-white/[0.06] pt-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  {team.members?.length || 0} member{(team.members?.length || 0) !== 1 ? 's' : ''}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(team.members || []).slice(0, 6).map((m) => (
                    <span key={m._id} title={m.email}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600 dark:bg-white/[0.06] dark:text-gray-300">
                      {m.name || m.email?.split('@')[0]}
                    </span>
                  ))}
                  {(team.members?.length || 0) > 6 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-500 dark:bg-white/[0.06] dark:text-gray-400">
                      +{team.members.length - 6} more
                    </span>
                  )}
                  {(team.members?.length || 0) === 0 && (
                    <span className="text-xs text-gray-400 italic">No members assigned</span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <CreateTeamModal users={users} onClose={() => setShowModal(false)} onCreate={load} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
