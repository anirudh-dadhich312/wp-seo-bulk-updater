import app from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';

const start = async () => {
  await connectDB();
  app.listen(env.PORT, () => {
    console.log(`[server] running on http://localhost:${env.PORT}`);
  });
};

start().catch((err) => {
  console.error('[server] failed to start', err);
  process.exit(1);
});
