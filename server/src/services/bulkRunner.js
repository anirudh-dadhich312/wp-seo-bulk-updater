import EventEmitter from 'events';
import pLimit from 'p-limit';
import { createWpClient } from './wpClient.js';
import { resolvePostFromUrl } from './urlResolver.js';
import { readPostMeta, writePostMeta, readTermMeta, writeTermMeta } from './metaWriter.js';
import { detectForSite } from './pluginDetector.js';
import AuditLog from '../models/AuditLog.js';
import Job from '../models/Job.js';
import Site from '../models/Site.js';

const CONCURRENCY = 3;
const PER_REQUEST_DELAY = 200;
const MAX_RETRIES = 2;         // retry a row up to 2 extra times on transient errors
const RETRY_DELAY_BASE = 2000; // 2s → 4s backoff between retries

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isTransientError = (err) => {
  const code = err.code || '';
  const status = err.response?.status;
  // Network timeout / connection reset / 429 rate-limit / 5xx server error
  return (
    code === 'ECONNABORTED' || code === 'ETIMEDOUT' || code === 'ECONNRESET' ||
    code === 'ENOTFOUND'    || code === 'EAI_AGAIN'  ||
    status === 429 || (status >= 500 && status <= 599)
  );
};

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

  // Auto-redetect the SEO plugin before every job run so that a plugin
  // switch (e.g. Yoast → Rank Math) is picked up without any manual action.
  let plugin;
  try {
    const fresh = await detectForSite(site);
    plugin = fresh && fresh !== 'unknown' ? fresh : 'generic';
    if (fresh !== site.detectedPlugin) {
      await Site.findByIdAndUpdate(site._id, { detectedPlugin: fresh, lastDetectedAt: new Date() });
    }
  } catch (_) {
    plugin = site.detectedPlugin && site.detectedPlugin !== 'unknown'
      ? site.detectedPlugin
      : 'generic';
  }

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

        let attempt = 0;
        // Retry loop — retries only on transient network/server errors
        while (true) {
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

            // Read back and verify — some SEO plugins (especially Yoast taxonomy
            // meta) can silently swallow the write due to PHP object-cache issues.
            await delay(300); // small pause so any cache invalidation can settle
            const verifyMeta = await readTermMeta(wp, resolved.restBase, resolved.id);
            const titleMismatch = row.newTitle       && verifyMeta.title       !== row.newTitle;
            const descMismatch  = row.newDescription && verifyMeta.description !== row.newDescription;
            if (titleMismatch || descMismatch) {
              const mismatchFields = [
                titleMismatch       ? `title (wrote "${row.newTitle}", read back "${verifyMeta.title}")`             : null,
                descMismatch        ? `description (wrote "${row.newDescription}", read back "${verifyMeta.description}")` : null,
              ].filter(Boolean).join(', ');
              throw new Error(
                `Write verification failed for ${mismatchFields}. ` +
                'The SEO plugin accepted the request but the value did not persist. ' +
                'Try deactivating any caching plugins (WP Rocket, W3 Total Cache, LiteSpeed Cache) on the WordPress site and re-run.'
              );
            }

            rowUpdate[`rows.${idx}.resolvedPostId`]   = resolved.id;
            rowUpdate[`rows.${idx}.resolvedPostType`] = `taxonomy:${resolved.restBase}`;
          } else {
            // ── Standard post / page / CPT ────────────────────────────────
            try { oldMeta = await readPostMeta(wp, resolved.type, resolved.id, plugin); } catch (_) {}

            await writePostMeta(wp, resolved.type, resolved.id, plugin, {
              title: row.newTitle,
              description: row.newDescription,
            });

            // Read-back verification for post meta as well.
            await delay(300);
            try {
              const verifyMeta = await readPostMeta(wp, resolved.type, resolved.id, plugin);
              const titleMismatch = row.newTitle       && verifyMeta.title       !== row.newTitle;
              const descMismatch  = row.newDescription && verifyMeta.description !== row.newDescription;
              if (titleMismatch || descMismatch) {
                const mismatchFields = [
                  titleMismatch ? `title (wrote "${row.newTitle}", read back "${verifyMeta.title}")`             : null,
                  descMismatch  ? `description (wrote "${row.newDescription}", read back "${verifyMeta.description}")` : null,
                ].filter(Boolean).join(', ');
                throw new Error(
                  `Write verification failed for ${mismatchFields}. ` +
                  'The SEO plugin accepted the request but the value did not persist. ' +
                  'Try deactivating any caching plugins on the WordPress site and re-run.'
                );
              }
            } catch (verifyErr) {
              // If the verify read itself fails, re-throw so the row is marked failed
              throw verifyErr;
            }

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
            break; // success — exit retry loop
          } catch (err) {
            // Retry on transient network/server errors (timeout, 5xx, rate-limit)
            // but only if the job hasn't been cancelled.
            if (isTransientError(err) && attempt < MAX_RETRIES && !cancelRequests.has(String(jobId))) {
              attempt++;
              await delay(RETRY_DELAY_BASE * attempt); // 2s, then 4s
              continue; // retry
            }

            // Permanent failure — produce the most useful error string for the user
            const rawMsg = err.response?.data?.message
              || err.response?.data?.code
              || err.message
              || 'Unknown error';

            const isTimeout = err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT' ||
                              (err.message || '').toLowerCase().includes('timeout');

            // Map WP REST API codes / error types to plain-English messages
            const friendlyMsg =
              rawMsg.includes('rest_forbidden') || rawMsg.includes('not allowed')
                ? `Permission denied: The WordPress user does not have the required role (Editor or Administrator) to update this content. Full error: ${rawMsg}`
                : isTimeout
                  ? `Network timeout: the WordPress site did not respond within ${Math.round(25000 / 1000)}s (tried ${attempt + 1}×). Check the site is online and not blocking this server. Full error: ${rawMsg}`
                  : rawMsg;

            rowUpdate[`rows.${idx}.status`] = 'failed';
            rowUpdate[`rows.${idx}.error`]  = friendlyMsg;

            failedCount++;
            await Job.findByIdAndUpdate(jobId, { $set: rowUpdate, $inc: { failedCount: 1 } });
            break; // exit retry loop
          }
        } // end retry while

        emitter.emit('progress', {
          successCount,
          failedCount,
          skippedCount,
          totalRows:  job.totalRows,
          rowIndex:   idx,
          rowStatus:  rowUpdate[`rows.${idx}.status`],
          rowError:   rowUpdate[`rows.${idx}.error`] || null,
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
