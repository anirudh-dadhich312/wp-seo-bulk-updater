import mongoose from 'mongoose';
import { env } from './env.js';

export const connectDB = async () => {
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log('[db] mongo connected');
  } catch (err) {
    console.error('[db] mongo connection error', err);
    process.exit(1);
  }
};
