import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import { env } from '../config/env.js';

const signToken = (user) =>
  jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );

export const register = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'User already exists' });

    // The very first user on the platform becomes a super_admin with their own org.
    // All subsequent self-registrations create an independent admin with their own org.
    const isFirstUser = (await User.countDocuments()) === 0;
    const role = isFirstUser ? 'super_admin' : 'admin';

    // Create a personal organization for this user
    const org = await Organization.create({
      name: name ? `${name}'s Organization` : `${email.split('@')[0]}'s Organization`,
    });

    const user = await User.create({ email, password, name, role, organization: org._id });

    // Update org createdBy now that we have the user id
    await Organization.findByIdAndUpdate(org._id, { createdBy: user._id });

    const token = signToken(user);
    res.status(201).json({ token, user });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.status === 'invited') {
      return res.status(403).json({ error: 'Please accept your invite before logging in' });
    }

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user);
    res.json({ token, user });
  } catch (err) {
    next(err);
  }
};

export const me = async (req, res) => {
  res.json({ user: req.user });
};

// Validate an invite token — called by the AcceptInvite page to show user info
export const getInvite = async (req, res, next) => {
  try {
    const hashed = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      inviteToken:  hashed,
      inviteExpires: { $gt: Date.now() },
      status:        'invited',
    }).populate('organization', 'name').lean();

    if (!user) return res.status(400).json({ error: 'Invite link is invalid or has expired' });

    res.json({ email: user.email, name: user.name, organization: user.organization?.name });
  } catch (err) {
    next(err);
  }
};

// Accept an invite — user sets their password and becomes active
export const acceptInvite = async (req, res, next) => {
  try {
    const { password, name } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const hashed = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      inviteToken:  hashed,
      inviteExpires: { $gt: Date.now() },
      status:        'invited',
    });

    if (!user) return res.status(400).json({ error: 'Invite link is invalid or has expired' });

    user.password      = password;
    if (name) user.name = name;
    user.status        = 'active';
    user.inviteToken   = undefined;
    user.inviteExpires = undefined;
    await user.save();

    const token = signToken(user);
    res.json({ token, user });
  } catch (err) {
    next(err);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) return res.json({ message: 'If an account exists with that email, a reset link has been generated.' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken   = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    const resetUrl = `/reset-password/${resetToken}`;

    if (env.NODE_ENV === 'development') {
      return res.json({ message: 'Reset link generated.', resetUrl });
    }

    console.log(`[Password Reset] URL for ${email}: ${resetUrl}`);
    res.json({ message: 'If an account exists with that email, a reset link has been generated.' });
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const hashed = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken:   hashed,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ error: 'Reset link is invalid or has expired.' });

    user.password             = newPassword;
    user.resetPasswordToken   = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    const token = signToken(user);
    res.json({ token, user, message: 'Password updated successfully.' });
  } catch (err) {
    next(err);
  }
};
