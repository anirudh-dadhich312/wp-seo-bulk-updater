import AuditLog from '../models/AuditLog.js';

export const listAudits = async (req, res, next) => {
  try {
    const { siteId, jobId, limit = 200 } = req.query;
    const filter = {};
    if (siteId) filter.site = siteId;
    if (jobId) filter.job = jobId;

    const logs = await AuditLog.find(filter)
      .sort('-createdAt')
      .limit(Math.min(Number(limit) || 200, 1000))
      .populate('site', 'name siteUrl')
      .populate('performedBy', 'email name');

    res.json(logs);
  } catch (err) {
    next(err);
  }
};
