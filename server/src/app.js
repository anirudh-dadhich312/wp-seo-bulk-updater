import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { env } from './config/env.js';
import authRoutes from './routes/auth.js';
import siteRoutes from './routes/sites.js';
import jobRoutes from './routes/jobs.js';
import auditRoutes from './routes/audit.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// Basic rate limit on auth endpoints
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 50 }));

app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date() }));

app.use('/api/auth', authRoutes);
app.use('/api/sites', siteRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/audit', auditRoutes);

app.use(errorHandler);

export default app;
