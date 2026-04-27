import { Router } from 'express';
import {
  register, login, me,
  getInvite, acceptInvite,
  forgotPassword, resetPassword,
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/register',               register);
router.post('/login',                  login);
router.get('/me',      requireAuth,    me);
router.get('/invite/:token',           getInvite);
router.post('/accept-invite/:token',   acceptInvite);
router.post('/forgot-password',        forgotPassword);
router.post('/reset-password/:token',  resetPassword);

export default router;
