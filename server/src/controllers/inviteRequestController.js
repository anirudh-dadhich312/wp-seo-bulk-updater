import crypto from 'crypto';
import InviteRequest from '../models/InviteRequest.js';
import User from '../models/User.js';
import Team from '../models/Team.js';
import { env } from '../config/env.js';

// POST /api/invite-requests — public, no auth
export const createRequest = async (req, res, next) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'An account with this email already exists. Try logging in.' });

    const pending = await InviteRequest.findOne({ email, status: 'pending' });
    if (pending) return res.status(409).json({ error: 'A request from this email is already pending.' });

    const request = await InviteRequest.create({ name, email, message: message || '' });
    res.status(201).json({ ok: true, id: request._id });
  } catch (err) {
    next(err);
  }
};

// GET /api/invite-requests — admin+
export const listRequests = async (req, res, next) => {
  try {
    const requests = await InviteRequest.find({ status: 'pending' }).sort('-createdAt').lean();
    res.json(requests);
  } catch (err) {
    next(err);
  }
};

// POST /api/invite-requests/:id/approve — admin+
// Internally creates a User with status=invited (same as inviteUser) and returns the invite URL
export const approveRequest = async (req, res, next) => {
  try {
    const request = await InviteRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'Request already processed' });

    const existing = await User.findOne({ email: request.email });
    if (existing) {
      request.status = 'approved';
      await request.save();
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const rawToken  = crypto.randomBytes(32).toString('hex');
    const hashToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    const user = await User.create({
      email:         request.email,
      name:          request.name,
      role:          'team_member',
      organization:  req.user.organization,
      status:        'invited',
      inviteToken:   hashToken,
      inviteExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      password:      crypto.randomBytes(16).toString('hex'),
    });

    request.status      = 'approved';
    request.inviteToken = rawToken;
    await request.save();

    const inviteUrl = `${env.CLIENT_ORIGIN || ''}/accept-invite/${rawToken}`;
    res.json({ ok: true, inviteUrl, user });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/invite-requests/:id — admin+
export const rejectRequest = async (req, res, next) => {
  try {
    const request = await InviteRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    request.status = 'rejected';
    await request.save();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};
