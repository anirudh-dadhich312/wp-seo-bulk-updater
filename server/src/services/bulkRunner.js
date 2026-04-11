import pLimit from 'p-limit';
import { createWpClient } from './wpClient.js';
import { resolvePostFromUrl } from './urlResolver.js';
import { readPostMeta, writePostMeta } from './metaWriter.js';
import AuditLog from '../models/AuditLog.js';
import Job from '../models/Job.js';

const CONCURRENCY = 3;       // safe default for shared hosts
const PER_REQUEST_DELAY = 200; // ms cooldown after each request

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Execute a bulk meta update job.
 * Updates job status + per-row state in MongoDB as it progresses.
 * Designed to be called fire-and-forget from a controller.
 */
export const runBulkJob = async (jobId, userId) => {
  const job = await Job.findById(jobId).populate('site');
  if (!job) throw new Error('Job not found');
  if (!job.site) throw new Error('Job has no associated site');

  const site = job.site;
  const plugin = site.detectedPlugin && site.detectedPlugin !== 'unknown'
    ? site.detectedPlugin
    : 'generic';
  const wp = createWpClient(site);

  job.status = 'running';
  job.startedAt = new Date();
  job.pluginUsed = plugin;
  await job.save();

  const limit = pLimit(CONCURRENCY);

  await Promise.all(
    job.rows.map((row, idx) =>
      limit(async () => {
        try {
          // 1. Resolve URL → post id + type
          const { id: postId, type: postType } = await resolvePostFromUrl(wp, row.postUrl);

          // 2. Read current meta (best-effort, used for audit + rollback)
          let oldMeta = { title: '', description: '' };
          try {
            oldMeta = await readPostMeta(wp, postType, postId, plugin);
          } catch (_) {
            // non-fatal — some sites restrict edit context
          }

          // 3. Write new meta
          await writePostMeta(wp, postType, postId, plugin, {
            title: row.newTitle,
            description: row.newDescription,
          });

          // 4. Mutate row in place (Mongoose will pick up the change on save)
          job.rows[idx].resolvedPostId = postId;
          job.rows[idx].resolvedPostType = postType;
          job.rows[idx].oldTitle = oldMeta.title;
          job.rows[idx].oldDescription = oldMeta.description;
          job.rows[idx].status = 'success';
          job.rows[idx].processedAt = new Date();

          // 5. Audit log entries (one per field for granular rollback)
          await AuditLog.insertMany([
            {
              site: site._id,
              job: job._id,
              postId,
              postType,
              postUrl: row.postUrl,
              plugin,
              field: 'title',
              oldValue: oldMeta.title,
              newValue: row.newTitle,
              performedBy: userId,
            },
            {
              site: site._id,
              job: job._id,
              postId,
              postType,
              postUrl: row.postUrl,
              plugin,
              field: 'description',
              oldValue: oldMeta.description,
              newValue: row.newDescription,
              performedBy: userId,
            },
          ]);

          await delay(PER_REQUEST_DELAY);
        } catch (err) {
          job.rows[idx].status = 'failed';
          job.rows[idx].error = err.response?.data?.message || err.message;
          job.rows[idx].processedAt = new Date();
        }
      })
    )
  );

  job.successCount = job.rows.filter((r) => r.status === 'success').length;
  job.failedCount = job.rows.filter((r) => r.status === 'failed').length;
  job.status = 'completed';
  job.completedAt = new Date();
  job.markModified('rows');
  await job.save();

  return job;
};

/**
 * Roll back every successful row in a job by re-writing the previously stored
 * oldTitle / oldDescription back to WordPress.
 */
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
          await writePostMeta(wp, row.resolvedPostType, row.resolvedPostId, plugin, {
            title: row.oldTitle || '',
            description: row.oldDescription || '',
          });

          await AuditLog.create({
            site: job.site._id,
            job: job._id,
            postId: row.resolvedPostId,
            postType: row.resolvedPostType,
            postUrl: row.postUrl,
            plugin,
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
