import { Router } from 'express';
import { IntegrationController } from '../controllers/integrationController.ts';
import { requireAuth } from '../middleware/authMiddleware.ts';

const router = Router();

router.post('/integrations/imap', requireAuth, IntegrationController.saveImap);
router.post('/integrations/test-imap', requireAuth, IntegrationController.testImap);
router.post('/integrations/webhook', requireAuth, IntegrationController.saveWebhook);
router.post('/apikeys/roll', requireAuth, IntegrationController.rollApiKey);
router.post('/payment-links/create', requireAuth, IntegrationController.createPaymentLink);
router.get('/payment-links', requireAuth, IntegrationController.getPaymentLinks);
router.delete('/payment-links/:id', requireAuth, IntegrationController.deletePaymentLink);
router.get('/transactions', requireAuth, IntegrationController.getTransactions);

export default router;
