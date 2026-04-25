import Site from '../models/Site.js';
import { encrypt } from '../services/cryptoService.js';
import { testConnection } from '../services/wpClient.js';
import { detectSEOPlugin, detectForSite } from '../services/pluginDetector.js';

export const listSites = async (req, res, next) => {
  try {
    const sites = await Site.find({ createdBy: req.user._id }).sort('-createdAt');
    res.json(sites);
  } catch (err) {
    next(err);
  }
};

export const getSite = async (req, res, next) => {
  try {
    const site = await Site.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!site) return res.status(404).json({ error: 'Site not found' });
    res.json(site);
  } catch (err) {
    next(err);
  }
};

export const createSite = async (req, res, next) => {
  try {
    const { name, siteUrl, username, appPassword, notes } = req.body;
    if (!name || !siteUrl || !username || !appPassword) {
      return res.status(400).json({ error: 'name, siteUrl, username, appPassword are required' });
    }

    const conn = await testConnection(siteUrl, username, appPassword);
    if (!conn.ok) {
      return res.status(400).json({ error: `WordPress connection failed: ${conn.error}` });
    }

    // 2. Auto-detect SEO plugin
    const plugin = await detectSEOPlugin(siteUrl, username, appPassword);

    // 3. Persist (password is encrypted at rest)
    const site = await Site.create({
      name,
      siteUrl: siteUrl.replace(/\/$/, ''),
      username,
      appPasswordEncrypted: encrypt(appPassword),
      detectedPlugin: plugin,
      lastDetectedAt: new Date(),
      notes,
      createdBy: req.user._id,
    });

    res.status(201).json(site);
  } catch (err) {
    next(err);
  }
};

export const updateSite = async (req, res, next) => {
  try {
    const { name, siteUrl, username, appPassword, notes } = req.body;
    const update = {};
    if (name) update.name = name;
    if (siteUrl) update.siteUrl = siteUrl.replace(/\/$/, '');
    if (username) update.username = username;
    if (appPassword) update.appPasswordEncrypted = encrypt(appPassword);
    if (notes !== undefined) update.notes = notes;

    let site = await Site.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      update,
      { new: true }
    );
    if (!site) return res.status(404).json({ error: 'Site not found' });

    // If connection details changed, re-detect the active SEO plugin automatically
    if (siteUrl || username || appPassword) {
      try {
        const plugin = await detectForSite(site);
        site = await Site.findByIdAndUpdate(
          site._id,
          { detectedPlugin: plugin, lastDetectedAt: new Date() },
          { new: true }
        );
      } catch (_) {}
    }

    res.json(site);
  } catch (err) {
    next(err);
  }
};

export const deleteSite = async (req, res, next) => {
  try {
    const site = await Site.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!site) return res.status(404).json({ error: 'Site not found' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

export const redetectPlugin = async (req, res, next) => {
  try {
    const site = await Site.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!site) return res.status(404).json({ error: 'Site not found' });

    const plugin = await detectForSite(site);
    site.detectedPlugin = plugin;
    site.lastDetectedAt = new Date();
    await site.save();
    res.json(site);
  } catch (err) {
    next(err);
  }
};
