import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

// Public endpoint — no auth required so users can download before signing up
router.get('/download', async (req, res) => {
  const pluginDir = path.resolve(__dirname, '../../../wp-plugin/seo-bulk-updater-bridge');

  if (!fs.existsSync(pluginDir)) {
    return res.status(404).json({ error: 'Plugin files not found on server' });
  }

  try {
    // Buffer the entire zip in memory first so we can send Content-Length
    const chunks = [];
    await new Promise((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 6 } });
      archive.on('error', reject);
      archive.on('data', (chunk) => chunks.push(chunk));
      archive.on('end', resolve);
      archive.directory(pluginDir, 'seo-bulk-updater-bridge');
      archive.finalize();
    });

    const buffer = Buffer.concat(chunks);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="seo-bulk-updater-bridge.zip"');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'no-cache');
    res.end(buffer);
  } catch (err) {
    console.error('Plugin zip error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Failed to create plugin archive' });
  }
});

export default router;
