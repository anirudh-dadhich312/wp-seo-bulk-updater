import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import { env } from './config/env.js';
import authRoutes          from './routes/auth.js';
import siteRoutes          from './routes/sites.js';
import jobRoutes           from './routes/jobs.js';
import auditRoutes         from './routes/audit.js';
import userRoutes          from './routes/users.js';
import teamRoutes          from './routes/teams.js';
import pluginRoutes        from './routes/plugin.js';
import inviteRequestRoutes from './routes/inviteRequests.js';
import altTagJobRoutes     from './routes/altTagJobs.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Railway (and most PaaS) sits behind a reverse proxy that sets X-Forwarded-For.
// Without this, express-rate-limit throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
// and cannot identify clients correctly.
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, Postman, same-origin SSR)
    if (!origin) return cb(null, true);
    if (env.CLIENT_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
// Compress JSON/text responses — skip binary downloads that are already compressed
app.use(compression({
  filter: (req, res) => {
    const ct = res.getHeader('Content-Type') || '';
    if (String(ct).includes('application/zip') || String(ct).includes('application/octet-stream')) {
      return false;
    }
    return compression.filter(req, res);
  },
}));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

// Tight limit on auth endpoints (brute-force protection)
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
}));

// Global API rate limit — generous enough for normal use
app.use('/api', rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  skip: (req) => req.path.endsWith('/events'), // SSE endpoints must not be rate-limited
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
}));

app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date() }));

app.use('/api/auth',            authRoutes);
app.use('/api/sites',           siteRoutes);
app.use('/api/jobs',            jobRoutes);
app.use('/api/audit',           auditRoutes);
app.use('/api/users',           userRoutes);
app.use('/api/teams',           teamRoutes);
app.use('/api/plugin',          pluginRoutes);
app.use('/api/invite-requests', inviteRequestRoutes);
app.use('/api/alt-tag-jobs',   altTagJobRoutes);

app.use(errorHandler);

export default app;
