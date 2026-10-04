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

    if (!dbService.isUserSubscriptionActive(req.user)) {
      return res.status(403).json({
        success: false,
        error: 'Subscription Expired',
        message: 'Your 5-day trial or subscription has expired. Please activate your subscription to create payment links.',
        requires_subscription: true,
      });
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
   * POST /api/integrations/upi-settings
   * Quickly update Primary and Backup UPI IDs without re-entering App Password
   */
  public static async updateUpiSettings(req: AuthenticatedRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { fampayUpiId, backupUpiId } = req.body || {};

    if (!fampayUpiId || !fampayUpiId.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid Primary UPI ID (e.g. username@fam, merchant@upi).',
      });
    }

    if (backupUpiId && !backupUpiId.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Backup UPI ID must be a valid UPI ID (e.g. yourname@okaxis, yourname@ybl).',
      });
    }

    const cleanPrimary = fampayUpiId.trim();
    const cleanBackup = backupUpiId ? backupUpiId.trim() : undefined;

    await dbService.updateUserUpiSettings(req.user.id, cleanPrimary, cleanBackup);
    const updatedUser = await dbService.findUserById(req.user.id);

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    await dbService.addLog({
      user_id: req.user.id,
      user_email: req.user.email,
      action: 'UPDATE_UPI_SETTINGS',
      ip: clientIp,
      status: 'SUCCESS',
      details: `Updated UPI routing: Primary=${cleanPrimary}, Backup=${cleanBackup || 'None'}. All active checkout links & QR codes refreshed.`,
    });

    return res.status(200).json({
      success: true,
      message: 'UPI settings and dynamic QR routing updated successfully! All active checkout pages now use your new UPI ID.',
      user: updatedUser,
    });
  }

  /**
   * POST /api/integrations/test-imap
   */
  public static async testImap(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const user = await dbService.findUserById(req.user.id);
    const { email, appPassword, host, port } = req.body || {};

    const targetEmail = (email && email.trim()) || user?.fampay_gmail || user?.email;
    const targetPassword = (appPassword && appPassword.trim()) || user?.google_app_password;

    if (!targetEmail || !targetPassword) {
      return res.status(400).json({
        success: false,
        error: 'No IMAP credentials provided. Please enter your Gmail address and 16-character Google App Password.',
      });
    }

    const resolvedHost = (host && host.trim()) || user?.imap_host || ImapService.resolveHost(targetEmail);
    const resolvedPort = Number(port) || user?.imap_port || 993;

    const result = await ImapService.testConnection(
      targetEmail,
      targetPassword,
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

    if (!dbService.isUserSubscriptionActive(req.user)) {
      return res.status(403).json({
        success: false,
        error: 'Subscription Expired',
        message: 'Your 5-day free trial or active subscription has expired. Please activate your subscription to create payment links.',
        requires_subscription: true,
      });
    }

    const { title, amount, description, success_url, cancel_url, expiry_minutes } = req.body || {};
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Valid payment amount is required.' });
    }

    const cleanTitle = (title && title.toString().trim().length > 0)
      ? title.toString().trim()
      : `Payment (₹${parsedAmount.toFixed(0)})`;

    const parsedExpiry = expiry_minutes && !isNaN(parseInt(expiry_minutes, 10)) && parseInt(expiry_minutes, 10) > 0
      ? parseInt(expiry_minutes, 10)
      : 8;

    const link = await dbService.createPaymentLink({
      user_id: req.user.id,
      title: cleanTitle,
      amount: parsedAmount,
      description: description ? description.toString().trim() : '',
      success_url: success_url ? success_url.toString().trim() : undefined,
      cancel_url: cancel_url ? cancel_url.toString().trim() : undefined,
      expiry_minutes: parsedExpiry,
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
    if (!link) {
      await dbService.deletePaymentLink(id);
      return res.status(200).json({ success: true, deleted: true, message: 'Link removed.' });
    }

    // Allow owner or admin
    if (link.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Permission denied: cannot delete payment link belonging to another user.' });
    }

    const deleted = await dbService.deletePaymentLink(id);

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    await dbService.addLog({
      user_id: req.user.id,
      user_email: req.user.email,
      action: 'PAYMENT_LINK_DELETED',
      ip: clientIp,
      status: 'SUCCESS',
      details: `Payment link ${id} (${link.title || ''}) deleted successfully.`,
    });

    return res.status(200).json({ success: true, deleted, message: 'Payment link deleted successfully.' });
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
