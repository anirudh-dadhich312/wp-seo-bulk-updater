import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listAudits, getPerformers } from '../controllers/auditController.js';

const router = Router();
router.use(requireAuth);

router.get('/',           listAudits);
router.get('/performers', getPerformers);

export default router;
