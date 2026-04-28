import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

const ZIP_PATH = path.resolve(__dirname, '../../../wp-plugin/seo-bulk-updater-bridge.zip');

// Public endpoint — no auth required so users can download before signing up
router.get('/download', (req, res) => {
  if (!fs.existsSync(ZIP_PATH)) {
    return res.status(404).json({ error: 'Plugin zip not found on server' });
  }

  const stat = fs.statSync(ZIP_PATH);
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="seo-bulk-updater-bridge.zip"');
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Cache-Control', 'no-cache');

  fs.createReadStream(ZIP_PATH).pipe(res);
});

export default router;
