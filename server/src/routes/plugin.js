import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

// Public endpoint — no auth required so unauthenticated users can download before signing up
router.get('/download', (req, res) => {
  const pluginDir = path.resolve(__dirname, '../../../wp-plugin/seo-bulk-updater-bridge');

  if (!fs.existsSync(pluginDir)) {
    return res.status(404).json({ error: 'Plugin files not found on server' });
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="seo-bulk-updater-bridge.zip"');

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err) => {
    console.error('Archive error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Failed to create archive' });
  });

  archive.pipe(res);
  archive.directory(pluginDir, 'seo-bulk-updater-bridge');
  archive.finalize();
});

export default router;
