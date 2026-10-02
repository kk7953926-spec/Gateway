import { Response } from 'express';
import { dbService } from '../database/db.ts';
import { AuthenticatedRequest } from '../middleware/authMiddleware.ts';
import { ImapService } from '../services/imapService.ts';

export class IntegrationController {
  /**
   * POST /api/integrations/imap
   * Connects user's FamPay/PhonePe Gmail, UPI ID, and 16-digit Google App Password
   */
  public static async saveImap(req: AuthenticatedRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { fampayGmail, fampayUpiId, googleAppPassword, imapHost, imapPort } = req.body || {};

    if (!fampayGmail || !fampayGmail.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address linked to your payment alerts.',
      });
    }

    if (!fampayUpiId || !fampayUpiId.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid UPI ID (e.g. username@fam, username@ybl, or merchant@upi).',
      });
    }

    const cleanAppPass = (googleAppPassword || '').replace(/\s+/g, '');
    if (cleanAppPass.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid App Password (16 characters for Google).',
      });
    }

    const resolvedHost = (imapHost && imapHost.trim()) || ImapService.resolveHost(fampayGmail);
    const resolvedPort = Number(imapPort) || 993;

    // Live test connection to the mail server
    const testResult = await ImapService.testConnection(
      fampayGmail,
      cleanAppPass,
      resolvedHost,
      resolvedPort
    );
    if (!testResult.success) {
      return res.status(400).json({
        success: false,
        error: testResult.message,
      });
    }

    const updatedUser = await dbService.updateUserImap(
      req.user.id,
      fampayGmail,
      fampayUpiId,
      googleAppPassword,
      resolvedHost,
      resolvedPort
    );

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    await dbService.addLog({
      user_id: req.user.id,
      user_email: req.user.email,
      action: 'CONNECT_IMAP_SUCCESS',
      ip: clientIp,
      status: 'SUCCESS',
      details: `Mail IMAP connected for ${fampayGmail} on ${resolvedHost}:${resolvedPort}. Total INBOX emails: ${testResult.totalEmails || 0}.`,
    });

    return res.status(200).json({
      success: true,
      message: `Mail server (${resolvedHost}) successfully connected! Found ${testResult.totalEmails || 0} emails in INBOX. Real-time verification is now ACTIVE.`,
      user: updatedUser,
      totalEmails: testResult.totalEmails,
      host: resolvedHost,
    });
  }

  /**
   * POST /api/integrations/test-imap
   */
  public static async testImap(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const user = await dbService.findUserById(req.user.id);
    const targetEmail = user?.fampay_gmail || user?.email;
    if (!user || !targetEmail || !user.google_app_password) {
      return res.status(400).json({
        success: false,
        error: 'No IMAP credentials configured. Please configure your Email & App Password.',
      });
    }

    const resolvedHost = user.imap_host || ImapService.resolveHost(targetEmail);
    const resolvedPort = user.imap_port || 993;

    const result = await ImapService.testConnection(
      targetEmail,
      user.google_app_password,
      resolvedHost,
      resolvedPort
    );
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.message });
    }

    return res.status(200).json({
      success: true,
      message: result.message,
      totalEmails: result.totalEmails,
      host: resolvedHost,
    });
  }

  /**
   * POST /api/apikeys/roll
   */
  public static async rollApiKey(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const newKey = await dbService.rollApiKey(req.user.id);
    return res.status(200).json({
      success: true,
      apiKey: newKey,
      message: 'API Key rolled successfully.',
    });
  }

  /**
   * POST /api/payment-links/create
   */
  public static async createPaymentLink(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { title, amount, description, success_url, cancel_url } = req.body || {};
    if (!title || !amount) {
      return res.status(400).json({ success: false, error: 'Title and amount are required.' });
    }

    const link = await dbService.createPaymentLink({
      user_id: req.user.id,
      title: title.toString().trim(),
      amount: parseFloat(amount) || 10,
      description: description ? description.toString().trim() : '',
      success_url: success_url ? success_url.toString().trim() : undefined,
      cancel_url: cancel_url ? cancel_url.toString().trim() : undefined,
    });

    return res.status(201).json({
      success: true,
      link,
    });
  }

  /**
   * GET /api/payment-links
   */
  public static async getPaymentLinks(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const links = await dbService.getPaymentLinksByUserId(req.user.id);
    return res.status(200).json({ success: true, links });
  }

  /**
   * DELETE /api/payment-links/:id
   */
  public static async deletePaymentLink(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const { id } = req.params;
    
    const link = await dbService.getPaymentLinkById(id);
    if (!link || link.user_id !== req.user.id) {
      return res.status(404).json({ success: false, error: 'Link not found.' });
    }

    const deleted = await dbService.deletePaymentLink(id);
    return res.status(200).json({ success: true, deleted });
  }

  /**
   * GET /api/transactions
   */
  public static async getTransactions(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const transactions = await dbService.getTransactionsByUserId(req.user.id);
    return res.status(200).json({ success: true, transactions });
  }

  /**
   * POST /api/integrations/webhook
   */
  public static async saveWebhook(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { url, secret } = req.body || {};
    if (url && !url.startsWith('http')) {
      return res.status(400).json({ success: false, error: 'Invalid Webhook URL. Must start with http:// or https://' });
    }

    const updatedUser = await dbService.updateUserWebhook(req.user.id, url, secret);

    return res.status(200).json({
      success: true,
      message: 'Webhook settings updated successfully.',
      webhook_url: updatedUser?.webhook_url,
      webhook_secret: updatedUser?.webhook_secret,
    });
  }
}
