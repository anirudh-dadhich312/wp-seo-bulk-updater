import AltTagJob from '../models/AltTagJob.js';
import Site from '../models/Site.js';
import { scanMedia, runAltTagJob, getAltJobEmitter, requestAltCancel } from '../services/altTagRunner.js';

export const createScanJob = async (req, res) => {
  const { siteId } = req.body;
  if (!siteId) return res.status(400).json({ error: 'siteId required' });

  const site = await Site.findById(siteId);
  if (!site) return res.status(404).json({ error: 'Site not found' });

  const job = await AltTagJob.create({
    site:         siteId,
    createdBy:    req.user._id,
    organization: req.user.organization,
    team:         req.user.team,
    status:       'scanning',
  });

  scanMedia(job._id).catch((err) =>
    console.error('[alt-tag scan]', err.message)
  );

  res.status(201).json(job);
};

export const listAltTagJobs = async (req, res) => {
  const filter = { createdBy: req.user._id };
  if (req.user.organization) filter.organization = req.user.organization;

  const jobs = await AltTagJob.find(filter)
    .sort({ createdAt: -1 })
    .populate('site', 'name siteUrl')
    .select('-items')
    .limit(50);

  res.json(jobs);
};

export const getAltTagJob = async (req, res) => {
  const job = await AltTagJob.findById(req.params.id)
    .populate('site', 'name siteUrl');
  if (!job) return res.status(404).json({ error: 'Not found' });
  res.json(job);
};

export const updateItems = async (req, res) => {
  const job = await AltTagJob.findById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  if (job.status !== 'draft') return res.status(400).json({ error: 'Job must be in draft state' });

  const { items } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items array required' });

  for (const patch of items) {
    const existing = job.items.find((i) => i.attachmentId === patch.attachmentId);
    if (existing) existing.newAlt = patch.newAlt ?? '';
  }

  await job.save();
  res.json({ ok: true });
};

export const runJob = async (req, res) => {
  const job = await AltTagJob.findById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  if (job.status !== 'draft') return res.status(400).json({ error: 'Job must be in draft state to run' });

  // Respond immediately; run async
  res.json({ ok: true, jobId: job._id });

  runAltTagJob(job._id, req.user._id).catch((err) =>
    console.error('[alt-tag run]', err.message)
  );
};

export const cancelJob = async (req, res) => {
  requestAltCancel(req.params.id);
  res.json({ ok: true });
};

export const streamProgress = async (req, res) => {
  const { id } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event, data) =>
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  // Send initial DB snapshot
  try {
    const job = await AltTagJob.findById(id).populate('site', 'name siteUrl');
    if (job) send('snapshot', job);
  } catch (_) {}

  const POLL_MS = 300;
  let pollTimer = null;

  const attach = () => {
    const emitter = getAltJobEmitter(id);
    if (!emitter) {
      pollTimer = setTimeout(attach, POLL_MS);
      return;
    }
    emitter.on('progress', (d) => send('progress', d));
    emitter.on('done',     (d) => { send('done', d); res.end(); });
  };

  attach();

  req.on('close', () => {
    if (pollTimer) clearTimeout(pollTimer);
    res.end();
  });
};
