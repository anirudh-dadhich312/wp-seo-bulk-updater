import crypto from 'crypto';
import User from '../models/User.js';
import Team from '../models/Team.js';
import { env } from '../config/env.js';

export const listUsers = async (req, res, next) => {
  try {
    const role = req.user.role;
    let filter;
    if (role === 'super_admin') {
      filter = {};
    } else if (role === 'admin') {
      filter = { organization: req.user.organization };
    } else {
      // team_leader: only their own team members (+ themselves)
      filter = req.user.team
        ? { $or: [{ team: req.user.team }, { _id: req.user._id }] }
        : { _id: req.user._id };
    }

    const users = await User.find(filter)
      .select('-password -resetPasswordToken -resetPasswordExpires -inviteToken')
      .populate('organization', 'name')
      .populate('team', 'name')
      .sort('-createdAt')
      .lean();

    res.json(users);
  } catch (err) {
    next(err);
  }
};

export const inviteUser = async (req, res, next) => {
  try {
    const { email, name } = req.body;
    let { role, teamId } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const requesterRole = req.user.role;

    // Team leaders can only invite team_member and must use their own team
    if (requesterRole === 'team_leader') {
      role   = 'team_member';
      teamId = req.user.team ? String(req.user.team) : undefined;
      if (!teamId) return res.status(400).json({ error: 'You must be assigned to a team before inviting members' });
    }

    const allowedRoles = ['admin', 'team_leader', 'team_member'];
    if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Admins cannot invite super_admin
    if (requesterRole === 'admin' && role === 'super_admin') {
      return res.status(403).json({ error: 'Cannot invite a super admin' });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'A user with that email already exists' });

    const rawToken  = crypto.randomBytes(32).toString('hex');
    const hashToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    const user = await User.create({
      email,
      name:          name || '',
      role:          role || 'team_member',
      organization:  req.user.organization,
      team:          teamId || undefined,
      status:        'invited',
      inviteToken:   hashToken,
      inviteExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      password:      crypto.randomBytes(16).toString('hex'),
    });

    if (teamId) {
      await Team.findByIdAndUpdate(teamId, { $addToSet: { members: user._id } });
    }

    const inviteUrl = `${env.CLIENT_ORIGIN || ''}/accept-invite/${rawToken}`;
    res.status(201).json({ user, inviteUrl });
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { role, teamId, name } = req.body;
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ error: 'User not found' });

    if (req.user.role !== 'super_admin' &&
        String(target.organization) !== String(req.user.organization)) {
      return res.status(403).json({ error: 'Cannot manage users from other organizations' });
    }
    if (String(target._id) === String(req.user._id) && role && role !== req.user.role) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }
    if (target.role === 'super_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Cannot modify a super admin' });
    }

    if (name  !== undefined) target.name = name;
    if (role)                target.role = role;

    if (teamId !== undefined) {
      if (target.team && String(target.team) !== String(teamId)) {
        await Team.findByIdAndUpdate(target.team, { $pull: { members: target._id } });
      }
      if (teamId) {
        await Team.findByIdAndUpdate(teamId, { $addToSet: { members: target._id } });
        target.team = teamId;
      } else {
        target.team = undefined;
      }
    }

    await target.save();
    res.json(target);
  } catch (err) {
    next(err);
  }
};

export const removeUser = async (req, res, next) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (String(target._id) === String(req.user._id)) {
      return res.status(400).json({ error: 'Cannot remove yourself' });
    }
    if (target.role === 'super_admin') {
      return res.status(403).json({ error: 'Cannot remove a super admin' });
    }
    if (req.user.role !== 'super_admin' &&
        String(target.organization) !== String(req.user.organization)) {
      return res.status(403).json({ error: 'Cannot remove users from other organizations' });
    }

    await Team.updateMany(
      { organization: target.organization },
      { $pull: { members: target._id, leader: target._id } }
    );
    await User.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};
