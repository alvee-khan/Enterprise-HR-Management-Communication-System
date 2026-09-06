import express from 'express';
import {
  register,
  login,
  logout,
  refreshToken,
  getMe,
  forgotPassword,
  resetPassword,
  updatePassword,
  setup2FA,
  verifyAndEnable2FA,
  disable2FA,
  getActiveSessions,
  deleteSession
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.post('/refresh', refreshToken);
router.get('/me', protect, getMe);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.put('/update-password', protect, updatePassword);

// 2FA Routes
router.post('/2fa/setup', protect, setup2FA);
router.post('/2fa/verify', protect, verifyAndEnable2FA);
router.post('/2fa/disable', protect, disable2FA);

// Session Routes
router.get('/sessions', protect, getActiveSessions);
router.delete('/sessions/:id', protect, deleteSession);

export default router;
