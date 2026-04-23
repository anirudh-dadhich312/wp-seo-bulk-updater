import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';

export const listAudits = async (req, res, next) => {
  try {
    const { siteId, jobId, performedBy, field, action, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (siteId)      filter.site        = siteId;
    if (jobId)       filter.job         = jobId;
    if (performedBy) filter.performedBy = performedBy;
    if (field)       filter.field       = field;
    if (action)      filter.action      = action;

    const pageNum  = Math.max(Number(page)  || 1, 1);
    const limitNum = Math.min(Number(limit) || 20, 100);
    const skip     = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .populate('site', 'name siteUrl')
        .populate('performedBy', 'email name'),
      AuditLog.countDocuments(filter),
    ]);

    res.json({ logs, total, page: pageNum, limit: limitNum, hasMore: skip + logs.length < total });
  } catch (err) {
    next(err);
  }
};

// Returns distinct users who have at least one audit entry — used to populate the "By" filter dropdown
export const getPerformers = async (req, res, next) => {
  try {
    const ids = await AuditLog.distinct('performedBy');
    const users = await User.find({ _id: { $in: ids } }).select('email name');
    res.json(users);
  } catch (err) {
    next(err);
  }
};
