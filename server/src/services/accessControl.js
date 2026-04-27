import Team from '../models/Team.js';

const effectiveRole = (user) =>
  user.role === 'operator' ? 'team_member' : user.role;

// Returns a MongoDB filter that restricts a Site or Job query to only
// the documents this user is allowed to see.
export const buildAccessFilter = async (user) => {
  const role = effectiveRole(user);

  if (role === 'super_admin') return {};

  if (role === 'admin') {
    // Admins see everything in their org, plus anything they created before
    // being assigned to an org (backward compat for existing data).
    if (!user.organization) return { createdBy: user._id };
    return {
      $or: [
        { organization: user.organization },
        { createdBy: user._id, organization: { $exists: false } },
      ],
    };
  }

  // team_leader / team_member: see resources belonging to their teams OR
  // resources they personally created (handles pre-RBAC data gracefully).
  const teams = await Team.find({
    organization: user.organization,
    $or: [{ leader: user._id }, { members: user._id }],
  }).select('_id').lean();

  const teamIds = teams.map((t) => t._id);

  return {
    $or: [
      { team: { $in: teamIds } },
      { createdBy: user._id },
    ],
  };
};

export const ROLE_LEVELS = {
  super_admin:  4,
  admin:        3,
  team_leader:  2,
  team_member:  1,
  operator:     1,
};

export const hasRole = (user, minimumRole) =>
  (ROLE_LEVELS[user.role] ?? 0) >= (ROLE_LEVELS[minimumRole] ?? 0);
