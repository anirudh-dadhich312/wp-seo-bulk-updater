import Team from '../models/Team.js';
import User from '../models/User.js';

export const listTeams = async (req, res, next) => {
  try {
    const filter = req.user.role === 'super_admin'
      ? {}
      : { organization: req.user.organization };

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
      await User.findByIdAndUpdate(leaderId, { role: 'team_leader', team: team._id });
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
