import EventEmitter from 'events';
import pLimit from 'p-limit';
import { createWpClient } from './wpClient.js';
import { resolvePostFromUrl } from './urlResolver.js';
import { readPostMeta, writePostMeta, readTermMeta, writeTermMeta } from './metaWriter.js';
import AuditLog from '../models/AuditLog.js';
import Job from '../models/Job.js';

const CONCURRENCY = 3;
const PER_REQUEST_DELAY = 200;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// In-memory emitter registry for SSE real-time progress
const jobEmitters = new Map();
export const getJobEmitter = (jobId) => jobEmitters.get(String(jobId));

// Jobs that have been requested to cancel (checked before each row)
const cancelRequests = new Set();
export const requestCancel = (jobId) => cancelRequests.add(String(jobId));

export const runBulkJob = async (jobId, userId) => {
  const job = await Job.findById(jobId).populate('site');
  if (!job) throw new Error('Job not found');
  if (!job.site) throw new Error('Job has no associated site');

  const site = job.site;
  const plugin = site.detectedPlugin && site.detectedPlugin !== 'unknown'
    ? site.detectedPlugin
    : 'generic';
  const wp = createWpClient(site);

  const emitter = new EventEmitter();
  emitter.setMaxListeners(20);
  jobEmitters.set(String(jobId), emitter);

  await Job.findByIdAndUpdate(jobId, {
    status: 'running',
    startedAt: new Date(),
    pluginUsed: plugin,
  });

  const limit = pLimit(CONCURRENCY);
  let successCount = 0;
  let failedCount  = 0;
  let skippedCount = 0;

  await Promise.all(
    job.rows.map((row, idx) =>
      limit(async () => {
        // Check for cancellation before starting each row
        if (cancelRequests.has(String(jobId))) {
          skippedCount++;
          await Job.findByIdAndUpdate(jobId, {
            $set: {
              [`rows.${idx}.status`]: 'skipped',
              [`rows.${idx}.processedAt`]: new Date(),
            },
          });
          emitter.emit('progress', { successCount, failedCount, skippedCount, totalRows: job.totalRows, rowIndex: idx, rowStatus: 'skipped' });
          return;
        }

        const rowUpdate = { [`rows.${idx}.processedAt`]: new Date() };

        try {
          const resolved = await resolvePostFromUrl(wp, row.postUrl);

          let oldMeta = { title: '', description: '' };

          if (resolved.kind === 'term') {
            // ── Taxonomy term (category, tag, custom taxonomy) ────────────
            try { oldMeta = await readTermMeta(wp, resolved.restBase, resolved.id); } catch (_) {}

            await writeTermMeta(wp, resolved.restBase, resolved.id, {
              title: row.newTitle,
              description: row.newDescription,
            });

            rowUpdate[`rows.${idx}.resolvedPostId`]   = resolved.id;
            rowUpdate[`rows.${idx}.resolvedPostType`] = `taxonomy:${resolved.restBase}`;
          } else {
            // ── Standard post / page / CPT ────────────────────────────────
            try { oldMeta = await readPostMeta(wp, resolved.type, resolved.id, plugin); } catch (_) {}

            await writePostMeta(wp, resolved.type, resolved.id, plugin, {
              title: row.newTitle,
              description: row.newDescription,
            });

            rowUpdate[`rows.${idx}.resolvedPostId`]   = resolved.id;
            rowUpdate[`rows.${idx}.resolvedPostType`] = resolved.type;
          }

          rowUpdate[`rows.${idx}.oldTitle`]       = oldMeta.title;
          rowUpdate[`rows.${idx}.oldDescription`] = oldMeta.description;
          rowUpdate[`rows.${idx}.status`]         = 'success';

          successCount++;
          await Job.findByIdAndUpdate(jobId, { $set: rowUpdate, $inc: { successCount: 1 } });

          await AuditLog.insertMany([
            {
              site: site._id, job: job._id,
              postId: resolved.id,
              postType: rowUpdate[`rows.${idx}.resolvedPostType`],
              postUrl: row.postUrl, plugin,
              field: 'title',
              oldValue: oldMeta.title, newValue: row.newTitle,
              performedBy: userId,
            },
            {
              site: site._id, job: job._id,
              postId: resolved.id,
              postType: rowUpdate[`rows.${idx}.resolvedPostType`],
              postUrl: row.postUrl, plugin,
              field: 'description',
              oldValue: oldMeta.description, newValue: row.newDescription,
              performedBy: userId,
            },
          ]);

          await delay(PER_REQUEST_DELAY);
        } catch (err) {
          rowUpdate[`rows.${idx}.status`] = 'failed';
          rowUpdate[`rows.${idx}.error`]  = err.response?.data?.message || err.message;

          failedCount++;
          await Job.findByIdAndUpdate(jobId, { $set: rowUpdate, $inc: { failedCount: 1 } });
        }

        emitter.emit('progress', {
          successCount,
          failedCount,
          skippedCount,
          totalRows: job.totalRows,
          rowIndex: idx,
          rowStatus: rowUpdate[`rows.${idx}.status`],
        });
      })
    )
  );

  const wasCancelled = cancelRequests.has(String(jobId));
  cancelRequests.delete(String(jobId));

  const finalStatus = wasCancelled ? 'cancelled' : 'completed';
  await Job.findByIdAndUpdate(jobId, { status: finalStatus, completedAt: new Date() });

  emitter.emit('done', { status: finalStatus, successCount, failedCount, skippedCount, totalRows: job.totalRows });
  setTimeout(() => jobEmitters.delete(String(jobId)), 5000);
};

export const rollbackJob = async (jobId, userId) => {
  const job = await Job.findById(jobId).populate('site');
  if (!job) throw new Error('Job not found');

  const plugin = job.pluginUsed || 'generic';
  const wp = createWpClient(job.site);
  const limit = pLimit(CONCURRENCY);

  const rows = job.rows.filter((r) => r.status === 'success' && r.resolvedPostId);

  await Promise.all(
    rows.map((row) =>
      limit(async () => {
        try {
          const isTaxonomy = String(row.resolvedPostType || '').startsWith('taxonomy:');

          if (isTaxonomy) {
            const restBase = row.resolvedPostType.replace('taxonomy:', '');
            await writeTermMeta(wp, restBase, row.resolvedPostId, {
              title: row.oldTitle || '',
              description: row.oldDescription || '',
            });
          } else {
            await writePostMeta(wp, row.resolvedPostType, row.resolvedPostId, plugin, {
              title: row.oldTitle || '',
              description: row.oldDescription || '',
            });
          }

          await AuditLog.create({
            site: job.site._id, job: job._id,
            postId: row.resolvedPostId,
            postType: row.resolvedPostType,
            postUrl: row.postUrl, plugin,
            field: 'both',
            oldValue: `${row.newTitle} | ${row.newDescription}`,
            newValue: `${row.oldTitle || ''} | ${row.oldDescription || ''}`,
            action: 'rollback',
            performedBy: userId,
          });

          await delay(PER_REQUEST_DELAY);
        } catch (err) {
          console.error('[rollback] failed for', row.postUrl, err.message);
        }
      })
    )
  );

  return { rolledBack: rows.length };
};
