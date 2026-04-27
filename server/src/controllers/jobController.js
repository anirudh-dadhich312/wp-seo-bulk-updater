import Job from '../models/Job.js';
import Site from '../models/Site.js';
import { parseMetaCsv } from '../services/csvParser.js';
import { runBulkJob, rollbackJob, getJobEmitter, requestCancel } from '../services/bulkRunner.js';
import { buildAccessFilter } from '../services/accessControl.js';

export const uploadCsvJob = async (req, res, next) => {
  try {
    const { siteId } = req.body;
    if (!siteId) return res.status(400).json({ error: 'siteId is required' });
    if (!req.file) return res.status(400).json({ error: 'CSV file is required' });

    const siteFilter = await buildAccessFilter(req.user);
    const site = await Site.findOne({ _id: siteId, ...siteFilter });
    if (!site) return res.status(404).json({ error: 'Site not found' });

    const rows = parseMetaCsv(req.file.buffer);

    const job = await Job.create({
      site:         site._id,
      createdBy:    req.user._id,
      organization: site.organization,
      team:         site.team,
      status:       'draft',
      totalRows:    rows.length,
      rows: rows.map((r) => ({
        postUrl:        r.postUrl,
        newTitle:       r.newTitle,
        newDescription: r.newDescription,
        status:         'pending',
      })),
    });

    res.status(201).json(job);
  } catch (err) {
    next(err);
  }
};

export const listJobs = async (req, res, next) => {
  try {
    const filter = await buildAccessFilter(req.user);
    if (req.query.siteId) filter.site = req.query.siteId;

    const jobs = await Job.find(filter)
      .populate('site', 'name siteUrl detectedPlugin')
      .sort('-createdAt')
      .select('-rows')
      .lean();
    res.json(jobs);
  } catch (err) {
    next(err);
  }
};

export const getJob = async (req, res, next) => {
  try {
    const accessFilter = await buildAccessFilter(req.user);
    const job = await Job.findOne({ _id: req.params.id, ...accessFilter })
      .populate('site', 'name siteUrl detectedPlugin')
      .lean();
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

    const newRows = rows.map((r) => ({
      postUrl: String(r.postUrl || '').trim(),
      newTitle: String(r.newTitle || '').trim(),
      newDescription: String(r.newDescription || '').trim(),
      status: 'pending',
    }));

    const job = await Job.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id, status: 'draft' },
      { rows: newRows, totalRows: newRows.length },
      { new: true }
    ).lean();
    if (!job) return res.status(404).json({ error: 'Editable draft job not found' });
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
    const job = await Job.findOne({ _id: req.params.id, createdBy: req.user._id }).lean();
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

export const cancelJob = async (req, res, next) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.status !== 'running') return res.status(400).json({ error: 'Job is not running' });

    requestCancel(job._id.toString());
    res.json({ ok: true, message: 'Cancel requested — remaining rows will be skipped' });
  } catch (err) {
    next(err);
  }
};

/**
 * SSE endpoint — streams real-time progress events while a job is running.
 * EventSource can't send custom headers, so the token is accepted via ?token=
 * (handled in requireAuth middleware).
 */
export const streamJobProgress = async (req, res) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!job) { res.status(404).end(); return; }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
    res.flushHeaders();

    const send = (type, data) =>
      res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);

    // Immediately send current DB state so the client has something to render
    send('snapshot', {
      status: job.status,
      successCount: job.successCount,
      failedCount: job.failedCount,
      totalRows: job.totalRows,
    });

    const emitter = getJobEmitter(String(job._id));

    // Job isn't running (already done, or emitter cleaned up) — close immediately
    if (!emitter) {
      send('done', { successCount: job.successCount, failedCount: job.failedCount, totalRows: job.totalRows });
      res.end();
      return;
    }

    const onProgress = (data) => send('progress', data);
    const onDone = (data) => { send('done', data); res.end(); };

    emitter.on('progress', onProgress);
    emitter.once('done', onDone);

    // Clean up listeners if the client disconnects early
    req.on('close', () => {
      emitter.off('progress', onProgress);
      emitter.off('done', onDone);
    });
  } catch (err) {
    console.error('[SSE] error', err);
    res.end();
  }
};
