import { ROLE_LEVELS } from '../services/accessControl.js';

// authorize('admin') — only admin or higher can proceed
// authorize('team_leader') — team_leader, admin, super_admin can proceed
export const authorize = (minimumRole) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const level = ROLE_LEVELS[req.user.role] ?? 0;
  const required = ROLE_LEVELS[minimumRole] ?? 0;
  if (level < required) {
    return res.status(403).json({ error: 'Insufficient permissions for this action' });
  }
  next();
};
