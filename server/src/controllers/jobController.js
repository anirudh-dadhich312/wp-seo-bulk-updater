import Job from '../models/Job.js';
import Site from '../models/Site.js';
import { parseMetaCsv } from '../services/csvParser.js';
import { runBulkJob, rollbackJob } from '../services/bulkRunner.js';

export const uploadCsvJob = async (req, res, next) => {
  try {
    const { siteId } = req.body;
    if (!siteId) return res.status(400).json({ error: 'siteId is required' });
    if (!req.file) return res.status(400).json({ error: 'CSV file is required' });

    const site = await Site.findOne({ _id: siteId, createdBy: req.user._id });
    if (!site) return res.status(404).json({ error: 'Site not found' });

    const rows = parseMetaCsv(req.file.buffer);

    const job = await Job.create({
      site: site._id,
      createdBy: req.user._id,
      status: 'draft',
      totalRows: rows.length,
      rows: rows.map((r) => ({
        postUrl: r.postUrl,
        newTitle: r.newTitle,
        newDescription: r.newDescription,
        status: 'pending',
      })),
    });

    res.status(201).json(job);
  } catch (err) {
    next(err);
  }
};

export const listJobs = async (req, res, next) => {
  try {
    const filter = { createdBy: req.user._id };
    if (req.query.siteId) filter.site = req.query.siteId;

    const jobs = await Job.find(filter)
      .populate('site', 'name siteUrl detectedPlugin')
      .sort('-createdAt')
      .select('-rows');
    res.json(jobs);
  } catch (err) {
    next(err);
  }
};

export const getJob = async (req, res, next) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, createdBy: req.user._id })
      .populate('site', 'name siteUrl detectedPlugin');
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (err) {
    next(err);
  }
};

export const updateJobRows = async (req, res, next) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows)) return res.status(400).json({ error: 'rows must be an array' });

    const job = await Job.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
      status: 'draft',
    });
    if (!job) return res.status(404).json({ error: 'Editable draft job not found' });

    job.rows = rows.map((r) => ({
      postUrl: String(r.postUrl || '').trim(),
      newTitle: String(r.newTitle || '').trim(),
      newDescription: String(r.newDescription || '').trim(),
      status: 'pending',
    }));
    job.totalRows = job.rows.length;
    await job.save();
    res.json(job);
  } catch (err) {
    next(err);
  }
};

export const runJob = async (req, res, next) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.status === 'running') return res.status(400).json({ error: 'Job already running' });

    // Fire-and-forget — the runner mutates the job document as it progresses
    runBulkJob(job._id, req.user._id).catch((err) => {
      console.error('[bulkRunner] job failed', err);
    });

    res.json({ ok: true, jobId: job._id, message: 'Job started' });
  } catch (err) {
    next(err);
  }
};

export const rollbackJobController = async (req, res, next) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const result = await rollbackJob(job._id, req.user._id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const downloadReport = async (req, res, next) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = 'post_url,status,resolved_post_id,resolved_post_type,new_title,new_description,old_title,old_description,error\n';
    const body = job.rows
      .map((r) =>
        [
          esc(r.postUrl),
          esc(r.status),
          esc(r.resolvedPostId),
          esc(r.resolvedPostType),
          esc(r.newTitle),
          esc(r.newDescription),
          esc(r.oldTitle),
          esc(r.oldDescription),
          esc(r.error),
        ].join(',')
      )
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="job-${job._id}-report.csv"`);
    res.send(header + body);
  } catch (err) {
    next(err);
  }
};
