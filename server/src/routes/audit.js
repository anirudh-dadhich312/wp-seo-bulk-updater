import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listAudits } from '../controllers/auditController.js';

const router = Router();
router.use(requireAuth);

router.get('/', listAudits);

export default router;
