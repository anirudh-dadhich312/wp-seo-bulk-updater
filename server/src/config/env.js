import dotenv from 'dotenv';
dotenv.config();

export const env = {
  PORT: Number(process.env.PORT || 5000),
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/wp-seo-updater',
  JWT_SECRET: process.env.JWT_SECRET || 'change-me-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef',
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_ORIGINS: (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
};

if (env.ENCRYPTION_KEY.length < 32) {
  console.warn('[env] ENCRYPTION_KEY should be at least 32 characters for AES-256');
}
