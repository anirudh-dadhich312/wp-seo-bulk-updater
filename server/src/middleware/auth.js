import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/User.js';

// Short-lived in-memory cache so we don't hit MongoDB on every API request.
// Each entry expires after 60 s — well within any reasonable JWT lifetime.
const userCache = new Map();
const CACHE_TTL = 60_000;

const getCachedUser = async (userId) => {
  const hit = userCache.get(userId);
  if (hit && hit.expiresAt > Date.now()) return hit.user;

  const user = await User.findById(userId).lean();
  if (user) userCache.set(userId, { user, expiresAt: Date.now() + CACHE_TTL });
  return user;
};

export const requireAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    // SSE clients can't set custom headers, so accept token from query param too
    const token = header.startsWith('Bearer ')
      ? header.slice(7)
      : (req.query.token || null);
    if (!token) return res.status(401).json({ error: 'Missing auth token' });

    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = await getCachedUser(decoded.id);
    if (!user) return res.status(401).json({ error: 'Invalid token' });

    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
};
