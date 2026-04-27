import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  createScanJob,
  listAltTagJobs,
  getAltTagJob,
  updateItems,
  runJob,
  cancelJob,
  streamProgress,
} from '../controllers/altTagJobController.js';

const router = Router();

router.use(requireAuth);

router.get('/',            listAltTagJobs);
router.post('/scan',       createScanJob);
router.get('/:id',         getAltTagJob);
router.put('/:id/items',   updateItems);
router.post('/:id/run',    runJob);
router.post('/:id/cancel', cancelJob);
router.get('/:id/events',  streamProgress);

export default router;
