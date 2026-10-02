import { Router } from 'express';
import { AuthController } from '../controllers/authController.ts';
import { requireAuth } from '../middleware/authMiddleware.ts';

const router = Router();

router.get('/profile', requireAuth, AuthController.getProfile);
router.get('/stats', requireAuth, AuthController.getUserStats);
router.put('/profile', requireAuth, AuthController.updateProfile);
router.post('/profile', requireAuth, AuthController.updateProfile);

export default router;
