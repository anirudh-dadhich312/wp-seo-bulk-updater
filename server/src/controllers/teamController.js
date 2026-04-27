import Team from '../models/Team.js';
import User from '../models/User.js';

export const listTeams = async (req, res, next) => {
  try {
    const role = req.user.role;
    let filter;
    if (role === 'super_admin') {
      filter = {};
    } else if (role === 'admin') {
      filter = { organization: req.user.organization };
    } else {
      // team_leader / team_member: only their own team
      filter = req.user.team ? { _id: req.user.team } : { _id: null };
    }

    const teams = await Team.find(filter)
      .populate('leader',  'name email role')
      .populate('members', 'name email role status')
      .lean();

    res.json(teams);
  } catch (err) {
    next(err);
  }
};

export const createTeam = async (req, res, next) => {
  try {
    const { name, leaderId } = req.body;
    if (!name) return res.status(400).json({ error: 'Team name is required' });
    if (!req.user.organization) {
      return res.status(400).json({ error: 'You must belong to an organization to create teams' });
    }

    const leader = leaderId || req.user._id;
    const team = await Team.create({
      name,
      organization: req.user.organization,
      leader,
      members: [leader],
    });

    if (leaderId) {
      const LEVELS = { super_admin: 4, admin: 3, team_leader: 2, team_member: 1, operator: 1 };
      const leaderUser = await User.findById(leaderId).lean();
      const currentLevel = LEVELS[leaderUser?.role] ?? 0;
      // Only promote to team_leader — never demote an admin or super_admin
      const update = currentLevel < LEVELS.team_leader
        ? { role: 'team_leader', team: team._id }
        : { team: team._id };
      await User.findByIdAndUpdate(leaderId, update);
    }

    res.status(201).json(team);
  } catch (err) {
    next(err);
  }
};

export const updateTeam = async (req, res, next) => {
  try {
    const orgFilter = req.user.role !== 'super_admin' ? { organization: req.user.organization } : {};
    const team = await Team.findOne({ _id: req.params.id, ...orgFilter });
    if (!team) return res.status(404).json({ error: 'Team not found' });

    const { name, leaderId, addMemberIds, removeMemberIds } = req.body;

    // Team leaders can only remove members from their own team
    if (req.user.role === 'team_leader') {
      if (!req.user.team || String(req.user.team) !== String(req.params.id)) {
        return res.status(403).json({ error: 'You can only manage your own team' });
      }
      if (name || leaderId || addMemberIds?.length) {
        return res.status(403).json({ error: 'Team leaders can only remove members' });
      }
      // Team leaders cannot remove the team leader
      if (removeMemberIds?.length) {
        const leaderIdStr = String(team.leader);
        if (removeMemberIds.some((id) => String(id) === leaderIdStr)) {
          return res.status(403).json({ error: 'Cannot remove the team leader — contact an admin' });
        }
      }
    }

    if (name) team.name = name;

    if (leaderId) {
      team.leader = leaderId;
      if (!team.members.map(String).includes(String(leaderId))) {
        team.members.push(leaderId);
      }
      await User.findByIdAndUpdate(leaderId, { role: 'team_leader', team: team._id });
    }

    if (addMemberIds?.length) {
      for (const id of addMemberIds) {
        if (!team.members.map(String).includes(String(id))) team.members.push(id);
      }
      await User.updateMany({ _id: { $in: addMemberIds } }, { team: team._id });
    }

    if (removeMemberIds?.length) {
      team.members = team.members.filter((m) => !removeMemberIds.includes(String(m)));
      await User.updateMany(
        { _id: { $in: removeMemberIds }, team: team._id },
        { $unset: { team: '' } }
      );
    }

    await team.save();
    res.json(team);
  } catch (err) {
    next(err);
  }
};

export const deleteTeam = async (req, res, next) => {
  try {
    const orgFilter = req.user.role !== 'super_admin' ? { organization: req.user.organization } : {};
    const team = await Team.findOneAndDelete({ _id: req.params.id, ...orgFilter });
    if (!team) return res.status(404).json({ error: 'Team not found' });

    await User.updateMany({ team: team._id }, { $unset: { team: '' } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};
