import { Router } from 'express';
import { createRequest, listRequests, approveRequest, rejectRequest } from '../controllers/inviteRequestController.js';
import { requireAuth } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.post('/',                    createRequest);
router.get('/',    requireAuth, authorize('admin'), listRequests);
router.post('/:id/approve', requireAuth, authorize('admin'), approveRequest);
router.delete('/:id',       requireAuth, authorize('admin'), rejectRequest);

export default router;
