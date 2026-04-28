import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

// Path to the pre-built zip (regenerated whenever the PHP plugin is updated)
const ZIP_PATH = path.resolve(__dirname, '../../../wp-plugin/seo-bulk-updater-bridge.zip');

// Public endpoint — no auth required so users can download before signing up
router.get('/download', (req, res) => {
  if (!fs.existsSync(ZIP_PATH)) {
    return res.status(404).json({ error: 'Plugin zip not found on server' });
  }

  res.setHeader('Content-Disposition', 'attachment; filename="seo-bulk-updater-bridge.zip"');
  res.setHeader('Cache-Control', 'no-cache');
  // sendFile sets Content-Type automatically from the .zip extension and
  // streams the file directly from disk — no buffering, no archiver needed.
  res.sendFile(ZIP_PATH);
});

export default router;
