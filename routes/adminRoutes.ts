import { Router } from 'express';
import { AdminController } from '../controllers/adminController.ts';
import { requireAdmin } from '../middleware/authMiddleware.ts';

const router = Router();

router.get('/stats', requireAdmin, AdminController.getStats);
router.get('/users', requireAdmin, AdminController.getUsers);
router.get('/verifications', requireAdmin, AdminController.getVerifications);
router.get('/logs', requireAdmin, AdminController.getLogs);
router.get('/settings', requireAdmin, AdminController.getSettings);
router.post('/settings', requireAdmin, AdminController.updateSettings);
router.post('/test-email', requireAdmin, AdminController.sendTestEmail);

// Subscription routes
router.get('/subscription-plans', requireAdmin, AdminController.getSubscriptionPlans);
router.post('/subscription-plans/create', requireAdmin, AdminController.createSubscriptionPlan);
router.post('/subscription-plans/delete', requireAdmin, AdminController.deleteSubscriptionPlan);
router.post('/users/assign-subscription', requireAdmin, AdminController.assignSubscription);

export default router;
