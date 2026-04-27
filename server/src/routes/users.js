import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { listUsers, inviteUser, updateUser, removeUser } from '../controllers/userController.js';

const router = Router();
router.use(requireAuth);

router.get('/',        authorize('team_leader'), listUsers);
router.post('/invite', authorize('team_leader'), inviteUser);
router.put('/:id',     authorize('admin'),       updateUser);
router.delete('/:id',  authorize('admin'),       removeUser);

export default router;
