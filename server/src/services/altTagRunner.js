import EventEmitter from 'events';
import pLimit from 'p-limit';
import { createWpClient } from './wpClient.js';
import AltTagJob from '../models/AltTagJob.js';
import AuditLog from '../models/AuditLog.js';

const CONCURRENCY    = 3;
const REQUEST_DELAY  = 200;
const SCAN_PAGE_SIZE = 100;

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// In-memory emitter registry for SSE real-time progress
const altJobEmitters = new Map();
export const getAltJobEmitter = (id) => altJobEmitters.get(String(id));

const cancelRequests = new Set();
export const requestAltCancel = (id) => cancelRequests.add(String(id));

// Paginate through /wp/v2/media and store all attachments on the job
export const scanMedia = async (jobId) => {
  const job = await AltTagJob.findById(jobId).populate('site');
  if (!job) throw new Error('Alt tag job not found');

  const wp = createWpClient(job.site);
  const items = [];

  try {
    let page = 1;
    let totalPages = 1;

    do {
      const res = await wp.get('/wp-json/wp/v2/media', {
        params: {
          per_page: SCAN_PAGE_SIZE,
          page,
          _fields: 'id,source_url,slug,title,alt_text',
          context: 'edit',
        },
      });

      totalPages = parseInt(res.headers['x-wp-totalpages'] || '1', 10);

      for (const m of res.data) {
        const filename = (m.source_url || '').split('/').pop() || m.slug || '';
        items.push({
          attachmentId: m.id,
          sourceUrl:    m.source_url || '',
          filename,
          title:        m.title?.rendered || filename,
          currentAlt:   m.alt_text || '',
          newAlt:       '',
          status:       'pending',
        });
      }

      page++;
    } while (page <= totalPages);

    await AltTagJob.findByIdAndUpdate(jobId, {
      status: 'draft',
      totalItems: items.length,
      items,
    });
  } catch (err) {
    await AltTagJob.findByIdAndUpdate(jobId, {
      status: 'failed',
      scanError: err.response?.data?.message || err.message,
    });
    throw err;
  }
};

// Apply newAlt values to WordPress media attachments
export const runAltTagJob = async (jobId, userId) => {
  const job = await AltTagJob.findById(jobId).populate('site');
  if (!job) throw new Error('Alt tag job not found');

  const emitter = new EventEmitter();
  emitter.setMaxListeners(20);
  altJobEmitters.set(String(jobId), emitter);

  const wp = createWpClient(job.site);
  const limit = pLimit(CONCURRENCY);

  await AltTagJob.findByIdAndUpdate(jobId, { status: 'running', startedAt: new Date() });

  // Only process items that have a newAlt value set
  const queue = job.items
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => item.newAlt && item.newAlt.trim() !== '');

  let updatedCount = 0;
  let failedCount  = 0;

  await Promise.all(
    queue.map(({ item, idx }) =>
      limit(async () => {
        if (cancelRequests.has(String(jobId))) {
          await AltTagJob.findByIdAndUpdate(jobId, {
            $set: {
              [`items.${idx}.status`]:       'skipped',
              [`items.${idx}.processedAt`]:  new Date(),
            },
          });
          emitter.emit('progress', { updatedCount, failedCount, total: queue.length, idx, rowStatus: 'skipped' });
          return;
        }

        const rowUpdate = { [`items.${idx}.processedAt`]: new Date() };

        try {
          await wp.post(`/wp-json/wp/v2/media/${item.attachmentId}`, {
            alt_text: item.newAlt.trim(),
          });

          rowUpdate[`items.${idx}.status`]     = 'success';
          rowUpdate[`items.${idx}.currentAlt`] = item.newAlt.trim();
          updatedCount++;

          await AltTagJob.findByIdAndUpdate(jobId, { $set: rowUpdate, $inc: { updatedCount: 1 } });

          await AuditLog.create({
            site:        job.site._id,
            job:         job._id,
            postId:      item.attachmentId,
            postType:    'attachment',
            postUrl:     item.sourceUrl,
            plugin:      'native',
            field:       'alt_text',
            oldValue:    item.currentAlt || '',
            newValue:    item.newAlt.trim(),
            performedBy: userId,
          });

          await delay(REQUEST_DELAY);
        } catch (err) {
          rowUpdate[`items.${idx}.status`] = 'failed';
          rowUpdate[`items.${idx}.error`]  = err.response?.data?.message || err.message;
          failedCount++;

          await AltTagJob.findByIdAndUpdate(jobId, { $set: rowUpdate, $inc: { failedCount: 1 } });
        }

        emitter.emit('progress', {
          updatedCount,
          failedCount,
          total: queue.length,
          idx,
          rowStatus: rowUpdate[`items.${idx}.status`],
        });
      })
    )
  );

  cancelRequests.delete(String(jobId));

  await AltTagJob.findByIdAndUpdate(jobId, { status: 'completed', completedAt: new Date() });
  emitter.emit('done', { status: 'completed', updatedCount, failedCount });
  setTimeout(() => altJobEmitters.delete(String(jobId)), 5000);
};
