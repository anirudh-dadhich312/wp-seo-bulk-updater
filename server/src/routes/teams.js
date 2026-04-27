import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { listTeams, createTeam, updateTeam, deleteTeam } from '../controllers/teamController.js';

const router = Router();
router.use(requireAuth);

router.get('/',       authorize('team_leader'), listTeams);
router.post('/',      authorize('admin'),        createTeam);
router.put('/:id',    authorize('team_leader'),  updateTeam);
router.delete('/:id', authorize('admin'),        deleteTeam);

export default router;
