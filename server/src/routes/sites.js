import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listSites,
  getSite,
  createSite,
  updateSite,
  deleteSite,
  redetectPlugin,
  checkWp,
} from '../controllers/siteController.js';

const router = Router();
router.use(requireAuth);

router.post('/check-wp', checkWp); // version + app-password probe (no site id needed)
router.get('/', listSites);
router.post('/', createSite);
router.get('/:id', getSite);
router.put('/:id', updateSite);
router.delete('/:id', deleteSite);
router.post('/:id/redetect', redetectPlugin);

export default router;
