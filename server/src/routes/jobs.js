import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { csvUpload } from '../middleware/upload.js';
import {
  uploadCsvJob,
  listJobs,
  getJob,
  updateJobRows,
  runJob,
  rollbackJobController,
  downloadReport,
} from '../controllers/jobController.js';

const router = Router();
router.use(requireAuth);

router.get('/', listJobs);
router.post('/upload', csvUpload.single('file'), uploadCsvJob);
router.get('/:id', getJob);
router.put('/:id/rows', updateJobRows);
router.post('/:id/run', runJob);
router.post('/:id/rollback', rollbackJobController);
router.get('/:id/report', downloadReport);

export default router;
