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
 * SSE endpoint — streams real-time job progress without any client polling.
 *
 * Why the poll loop: runBulkJob fires async after POST /run responds.
 * The emitter is created inside runBulkJob (after DB + plugin detection),
 * so the client can connect here before the emitter exists. We wait up to
 * 4 s for it to appear rather than immediately sending a false 'done'.
 */
export const streamJobProgress = async (req, res) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!job) { res.status(404).end(); return; }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // disable nginx / Vite proxy buffering
    res.flushHeaders();

    // Track client disconnect so we can stop all async work immediately
    let clientGone = false;
    req.on('close', () => { clientGone = true; });

    const write = (type, data) => {
      if (!clientGone) res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
    };

    // Send current DB state immediately so the UI has something to show
    write('snapshot', {
      status:       job.status,
      successCount: job.successCount,
      failedCount:  job.failedCount,
      totalRows:    job.totalRows,
    });

    // Heartbeat comment every 25 s — keeps the connection alive through
    // proxies and nginx that close idle streams after 30–60 s.
    const heartbeat = setInterval(() => {
      if (clientGone) return clearInterval(heartbeat);
      res.write(': ping\n\n');
    }, 25_000);

    let activeEmitter = null;

    const detach = () => {
      clearInterval(heartbeat);
      if (activeEmitter) {
        activeEmitter.off('progress', onProgress);
        activeEmitter.off('done',     onDone);
        activeEmitter = null;
      }
    };

    req.on('close', detach);

    const onProgress = (data) => write('progress', data);

    const onDone = (data) => {
      write('done', data);
      detach();
      if (!clientGone) res.end();
    };

    // Poll for the emitter — it's registered async inside runBulkJob.
    // 100 ms × 40 attempts = 4 s maximum wait before giving up.
    let attempts = 0;
    const attach = () => {
      if (clientGone) return;                          // client left while we waited

      const emitter = getJobEmitter(String(job._id));

      if (emitter) {
        activeEmitter = emitter;
        emitter.on('progress', onProgress);
        emitter.once('done',   onDone);
        return;
      }

      if (++attempts >= 40) {
        // Emitter never appeared — job finished, crashed, or was killed by SIGTERM.
        // Re-read from DB for fresh status so the client doesn't get a stale
        // 'running' status that causes it to reconnect in an infinite loop.
        try {
          const fresh = await Job.findById(job._id).lean();
          const finalStatus = (fresh?.status === 'running') ? 'failed' : (fresh?.status || 'failed');
          write('done', {
            status:       finalStatus,
            successCount: fresh?.successCount ?? job.successCount,
            failedCount:  fresh?.failedCount  ?? job.failedCount,
            totalRows:    fresh?.totalRows    ?? job.totalRows,
          });
          // If the job is still marked running in the DB (process was killed),
          // update it to failed so subsequent page loads show the correct state.
          if (fresh?.status === 'running') {
            await Job.findByIdAndUpdate(job._id, { status: 'failed', completedAt: new Date() });
          }
        } catch (_) {
          write('done', { status: 'failed', successCount: 0, failedCount: 0, totalRows: job.totalRows });
        }
        detach();
        res.end();
        return;
      }

      setTimeout(attach, 100);
    };

    attach();
  } catch (err) {
    console.error('[SSE] error', err);
    if (!res.headersSent) res.status(500).end();
    else res.end();
  }
};
