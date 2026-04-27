import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { listUsers, inviteUser, updateUser, removeUser } from '../controllers/userController.js';

const router = Router();
router.use(requireAuth);

router.get('/',       authorize('admin'), listUsers);
router.post('/invite', authorize('admin'), inviteUser);
router.put('/:id',    authorize('admin'), updateUser);
router.delete('/:id', authorize('admin'), removeUser);

export default router;
