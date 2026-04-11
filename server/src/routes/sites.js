import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listSites,
  getSite,
  createSite,
  updateSite,
  deleteSite,
  redetectPlugin,
} from '../controllers/siteController.js';

const router = Router();
router.use(requireAuth);

router.get('/', listSites);
router.post('/', createSite);
router.get('/:id', getSite);
router.put('/:id', updateSite);
router.delete('/:id', deleteSite);
router.post('/:id/redetect', redetectPlugin);

export default router;
