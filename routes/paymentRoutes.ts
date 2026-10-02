import { Router } from 'express';
import { PaymentController } from '../controllers/paymentController.ts';
import { requireAuth, requireAdmin, requireApiKey } from '../middleware/authMiddleware.ts';

const router = Router();

// Public customer checkout routes
router.get('/public-link/:id', PaymentController.getPublicLinkDetails);
router.get('/public-status/:id', PaymentController.getStatus);
router.get('/auto-detect/:id', PaymentController.autoDetect);
router.post('/public-verify-email', PaymentController.verifyEmailAlert);

// Standard API V1 (For external integrations)
router.post('/v1/order/create', requireApiKey, PaymentController.createApiOrder);
router.get('/v1/order/status/:id', requireApiKey, PaymentController.getApiOrderStatus);

// Authenticated merchant routes
router.get('/diagnostic-logs', requireAuth, PaymentController.getDiagnosticLogs);
router.post('/run-diagnostics', requireAuth, PaymentController.runDiagnostics);
router.post('/simulate-email', requireAuth, PaymentController.simulateEmailParser);
router.get('/checkout-settings', requireAuth, PaymentController.getCheckoutSettings);
router.post('/checkout-settings', requireAuth, PaymentController.updateCheckoutSettings);
router.post('/create-qr', requireAuth, PaymentController.createQr);
router.post('/subscription-checkout', requireAuth, PaymentController.createSubscriptionCheckout);
router.post('/verify-email-alert', requireAuth, PaymentController.verifyEmailAlert);
router.get('/status/:id', PaymentController.getStatus);
router.get('/my-payments', requireAuth, PaymentController.getMyPayments);
router.get('/admin/payments', requireAdmin, PaymentController.getAllPayments);

export default router;
