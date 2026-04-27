import Site from '../models/Site.js';
import { encrypt } from '../services/cryptoService.js';
import { testConnection, detectWpInfo } from '../services/wpClient.js';
import { detectSEOPlugin, detectForSite } from '../services/pluginDetector.js';
import { buildAccessFilter } from '../services/accessControl.js';

/**
 * Lightweight pre-check: given just a siteUrl, probe the WP REST root
 * and return version + app-password availability.
 * Called before the user submits credentials, so they know what to expect.
 */
export const checkWp = async (req, res, next) => {
  try {
    const { siteUrl } = req.body;
    if (!siteUrl) return res.status(400).json({ error: 'siteUrl required' });
    const info = await detectWpInfo(siteUrl);
    res.json(info);
  } catch (err) {
    next(err);
  }
};

export const listSites = async (req, res, next) => {
  try {
    const filter = await buildAccessFilter(req.user);
    const sites = await Site.find(filter).sort('-createdAt').lean();
    res.json(sites);
  } catch (err) {
    next(err);
  }
};

export const getSite = async (req, res, next) => {
  try {
    const filter = await buildAccessFilter(req.user);
    const site = await Site.findOne({ _id: req.params.id, ...filter });
    if (!site) return res.status(404).json({ error: 'Site not found' });
    res.json(site);
  } catch (err) {
    next(err);
  }
};

export const createSite = async (req, res, next) => {
  try {
    const { name, siteUrl, username, appPassword, notes, teamId } = req.body;
    if (!name || !siteUrl || !username || !appPassword) {
      return res.status(400).json({ error: 'name, siteUrl, username, appPassword are required' });
    }

    const conn = await testConnection(siteUrl, username, appPassword);
    if (!conn.ok) {
      return res.status(400).json({ error: `WordPress connection failed: ${conn.error}` });
    }

    const plugin = await detectSEOPlugin(siteUrl, username, appPassword);

    const site = await Site.create({
      name,
      siteUrl:              siteUrl.replace(/\/$/, ''),
      username,
      appPasswordEncrypted: encrypt(appPassword),
      wpVersion:            conn.wpVersion || null,
      detectedPlugin:       plugin,
      lastDetectedAt:       new Date(),
      notes,
      createdBy:    req.user._id,
      organization: req.user.organization,
      team:         teamId || req.user.team || undefined,
    });

    res.status(201).json(site);
  } catch (err) {
    next(err);
  }
};

export const updateSite = async (req, res, next) => {
  try {
    const { name, siteUrl, username, appPassword, notes, teamId } = req.body;
    const update = {};
    if (name)              update.name     = name;
    if (siteUrl)           update.siteUrl  = siteUrl.replace(/\/$/, '');
    if (username)          update.username = username;
    if (appPassword)       update.appPasswordEncrypted = encrypt(appPassword);
    if (notes !== undefined) update.notes  = notes;
    if (teamId !== undefined) update.team  = teamId || null;

    const accessFilter = await buildAccessFilter(req.user);
    let site = await Site.findOneAndUpdate(
      { _id: req.params.id, ...accessFilter },
      update,
      { new: true }
    );
    if (!site) return res.status(404).json({ error: 'Site not found' });

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
    const accessFilter = await buildAccessFilter(req.user);
    const site = await Site.findOneAndDelete({ _id: req.params.id, ...accessFilter });
    if (!site) return res.status(404).json({ error: 'Site not found' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

export const redetectPlugin = async (req, res, next) => {
  try {
    const accessFilter = await buildAccessFilter(req.user);
    const site = await Site.findOne({ _id: req.params.id, ...accessFilter });
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
