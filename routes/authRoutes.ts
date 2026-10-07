import { Router } from 'express';
import { AuthController } from '../controllers/authController.ts';
import { verificationRateLimiter } from '../middleware/rateLimiter.ts';
import { requireAuth } from '../middleware/authMiddleware.ts';

const router = Router();

router.post('/register', verificationRateLimiter, AuthController.register);
router.post('/send-verification', verificationRateLimiter, AuthController.sendVerification);
router.post('/resend-verification', verificationRateLimiter, AuthController.resendVerification);
router.post('/verify-email', AuthController.verifyEmail);
router.post('/login', AuthController.login);
router.post('/google', AuthController.googleAuth);
router.post('/reset-password', AuthController.resetPassword);

// Profile aliases under /api/auth
router.get('/profile', requireAuth, AuthController.getProfile);
router.put('/profile', requireAuth, AuthController.updateProfile);
router.post('/profile', requireAuth, AuthController.updateProfile);

export default router;
