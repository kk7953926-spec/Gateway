import { Router } from 'express';
import { IntegrationController } from '../controllers/integrationController.ts';
import { PaymentController } from '../controllers/paymentController.ts';
import { requireAuth, requireApiKey } from '../middleware/authMiddleware.ts';

const router = Router();

// Canonical REST API & Query Alias Endpoints
router.post('/create-order', requireApiKey, PaymentController.createApiOrder);
router.get('/create-order', requireApiKey, PaymentController.createApiOrder);
router.get('/qr.php', requireApiKey, PaymentController.createApiOrder);
router.post('/qr.php', requireApiKey, PaymentController.createApiOrder);
router.get('/order-status/:id', requireApiKey, PaymentController.getApiOrderStatus);

// Merchant Integration routes
router.post('/integrations/imap', requireAuth, IntegrationController.saveImap);
router.post('/integrations/test-imap', requireAuth, IntegrationController.testImap);
router.post('/integrations/webhook', requireAuth, IntegrationController.saveWebhook);
router.post('/apikeys/roll', requireAuth, IntegrationController.rollApiKey);
router.post('/payment-links/create', requireAuth, IntegrationController.createPaymentLink);
router.get('/payment-links', requireAuth, IntegrationController.getPaymentLinks);
router.delete('/payment-links/:id', requireAuth, IntegrationController.deletePaymentLink);
router.get('/transactions', requireAuth, IntegrationController.getTransactions);

export default router;
