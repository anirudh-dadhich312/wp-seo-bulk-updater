import app from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import Job from './models/Job.js';

const start = async () => {
  await connectDB();

  // Any job left in 'running' state from a previous process (crash / SIGTERM)
  // can never complete — mark them failed so the UI doesn't stay stuck forever.
  try {
    const stuck = await Job.updateMany(
      { status: 'running' },
      { status: 'failed', completedAt: new Date(),
        $set: { 'rows.$[el].status': 'skipped' } },
      { arrayFilters: [{ 'el.status': 'pending' }] }
    );
    if (stuck.modifiedCount) {
      console.log(`[server] marked ${stuck.modifiedCount} stuck job(s) as failed on startup`);
    }
  } catch (e) {
    console.error('[server] startup cleanup error', e.message);
  }

  const server = app.listen(env.PORT, () => {
    console.log(`[server] running on http://localhost:${env.PORT}`);
  });

  // Graceful shutdown: mark running jobs failed before the process exits.
  // Railway (and most PaaS) sends SIGTERM before killing the container.
  const shutdown = async (signal) => {
    console.log(`[server] ${signal} received — shutting down gracefully`);
    try {
      await Job.updateMany({ status: 'running' }, { status: 'failed', completedAt: new Date() });
    } catch (_) {}
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 8000); // force-exit after 8s
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
};

start().catch((err) => {
  console.error('[server] failed to start', err);
  process.exit(1);
});
