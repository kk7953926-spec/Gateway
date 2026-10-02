import { Response } from 'express';
import { dbService } from '../database/db.ts';
import { EmailService } from '../services/emailService.ts';
import { AuthenticatedRequest } from '../middleware/authMiddleware.ts';

export class AdminController {
  public static async getStats(req: AuthenticatedRequest, res: Response) {
    dbService.incrementApiRequests();
    const stats = dbService.getStats();
    return res.status(200).json({
      success: true,
      stats,
    });
  }

  public static async getUsers(req: AuthenticatedRequest, res: Response) {
    dbService.incrementApiRequests();
    const users = await dbService.getAllUsers();
    // Omit password hashes
    const sanitizedUsers = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      email_verified: u.email_verified,
      role: u.role,
      wallet_balance: u.wallet_balance || 0,
      subscription_plan_id: u.subscription_plan_id || '',
      subscription_expires_at: u.subscription_expires_at || '',
      subscription_status: u.subscription_status || 'none',
      created_at: u.created_at,
      updated_at: u.updated_at,
    }));

    return res.status(200).json({
      success: true,
      users: sanitizedUsers,
    });
  }

  public static async getVerifications(req: AuthenticatedRequest, res: Response) {
    dbService.incrementApiRequests();
    const verifications = await dbService.getAllVerifications();
    // Ensure code_hash is masked or sanitized
    const sanitized = verifications.map((v) => ({
      id: v.id,
      user_id: v.user_id,
      user_email: v.user_email,
      code_hash: v.code_hash ? v.code_hash.substring(0, 10) + '...' : 'masked',
      expires_at: v.expires_at,
      attempts: v.attempts,
      max_attempts: v.max_attempts,
      used: v.used,
      created_at: v.created_at,
    }));

    return res.status(200).json({
      success: true,
      verifications: sanitized,
    });
  }

  public static async getLogs(req: AuthenticatedRequest, res: Response) {
    dbService.incrementApiRequests();
    const logs = await dbService.getLogs();
    return res.status(200).json({
      success: true,
      logs,
    });
  }

  public static async getSettings(req: AuthenticatedRequest, res: Response) {
    dbService.incrementApiRequests();
    const settings = dbService.getSettings();
    const senderName = settings.sender_name || (settings.from && settings.from.includes('"') ? settings.from.split('"')[1] : 'FamGateway Payments');
    const senderEmail = settings.sender_email || settings.user || '';

    return res.status(200).json({
      success: true,
      settings: {
        host: settings.host,
        port: settings.port,
        user: settings.user,
        sender_name: senderName,
        sender_email: senderEmail,
        from: settings.from,
        maxAttempts: settings.maxAttempts,
        codeExpiryMinutes: settings.codeExpiryMinutes,
        rateLimitPerMin: settings.rateLimitPerMin,
        passConfigured: Boolean(settings.pass),
        sendgridKeyConfigured: Boolean(settings.sendgridKey),
      },
    });
  }

  public static async updateSettings(req: AuthenticatedRequest, res: Response) {
    dbService.incrementApiRequests();
    const { host, port, user, sender_name, sender_email, pass, from, sendgridKey, maxAttempts, codeExpiryMinutes, rateLimitPerMin } =
      req.body || {};

    const updated = dbService.updateSettings({
      ...(host && { host: host.toString() }),
      ...(port && { port: parseInt(port.toString(), 10) }),
      ...(user && { user: user.toString() }),
      ...(sender_name !== undefined && { sender_name: sender_name.toString() }),
      ...(sender_email && { sender_email: sender_email.toString() }),
      ...(pass && { pass: pass.toString() }),
      ...(from && { from: from.toString() }),
      ...(sendgridKey && { sendgridKey: sendgridKey.toString() }),
      ...(maxAttempts && { maxAttempts: parseInt(maxAttempts.toString(), 10) }),
      ...(codeExpiryMinutes && { codeExpiryMinutes: parseInt(codeExpiryMinutes.toString(), 10) }),
      ...(rateLimitPerMin && { rateLimitPerMin: parseInt(rateLimitPerMin.toString(), 10) }),
    });

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    await dbService.addLog({
      user_id: req.user?.id,
      user_email: req.user?.email,
      action: 'UPDATE_SYSTEM_SETTINGS',
      ip: clientIp,
      status: 'SUCCESS',
      details: 'Admin updated SMTP and sender configuration.',
    });

    const finalSenderName = updated.sender_name || (updated.from && updated.from.includes('"') ? updated.from.split('"')[1] : 'FamGateway Payments');
    const finalSenderEmail = updated.sender_email || updated.user || '';

    return res.status(200).json({
      success: true,
      message: 'System and SMTP settings updated successfully.',
      settings: {
        host: updated.host,
        port: updated.port,
        user: updated.user,
        sender_name: finalSenderName,
        sender_email: finalSenderEmail,
        from: updated.from,
        maxAttempts: updated.maxAttempts,
        codeExpiryMinutes: updated.codeExpiryMinutes,
        rateLimitPerMin: updated.rateLimitPerMin,
        passConfigured: Boolean(updated.pass),
        sendgridKeyConfigured: Boolean(updated.sendgridKey),
      },
    });
  }

  public static async sendTestEmail(req: AuthenticatedRequest, res: Response) {
    dbService.incrementApiRequests();
    const { testEmail, type } = req.body || {};
    const targetEmail = testEmail || req.user?.email || 'admin@fampayx.com';

    let emailRes;
    if (type === 'verification') {
      const testCode = '4829173056148273';
      emailRes = await EmailService.sendVerificationEmail(targetEmail, testCode, 10);
    } else {
      // Default to Payment Confirmation Receipt email with amount, transaction ID, UTR!
      emailRes = await EmailService.sendPaymentReceiptEmail({
        toEmail: targetEmail,
        amount: 250,
        upiId: 'kalamakash@fam',
        transactionRef: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
        utr: `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
        note: 'VIP Access (Test Receipt)',
        merchantName: 'FamGateway Payments',
      });
    }

    if (!emailRes.success) {
      return res.status(400).json({
        success: false,
        error: emailRes.error || 'SMTP delivery failed. Please check your App Password and host settings.',
        simulated: false,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Test payment confirmation email dispatched to ${targetEmail}`,
      simulated: emailRes.simulated,
      messageId: emailRes.messageId,
    });
  }

  // --- Subscriptions ---
  public static async getSubscriptionPlans(req: AuthenticatedRequest, res: Response) {
    dbService.incrementApiRequests();
    const plans = dbService.getSubscriptionPlans();
    return res.status(200).json({
      success: true,
      plans,
    });
  }

  public static async createSubscriptionPlan(req: AuthenticatedRequest, res: Response) {
    dbService.incrementApiRequests();
    const { name, durationDays, price } = req.body || {};
    if (!name || !durationDays || !price) {
      return res.status(400).json({ success: false, error: 'Name, Duration Days and Price are required.' });
    }

    const plan = dbService.createSubscriptionPlan(name, Number(durationDays), Number(price));
    return res.status(200).json({
      success: true,
      message: `Subscription plan '${name}' created successfully.`,
      plan,
    });
  }

  public static async deleteSubscriptionPlan(req: AuthenticatedRequest, res: Response) {
    dbService.incrementApiRequests();
    const { planId } = req.body || {};
    if (!planId) {
      return res.status(400).json({ success: false, error: 'planId is required.' });
    }

    dbService.deleteSubscriptionPlan(planId);
    return res.status(200).json({
      success: true,
      message: 'Subscription plan deleted successfully.',
    });
  }

  public static async assignSubscription(req: AuthenticatedRequest, res: Response) {
    dbService.incrementApiRequests();
    const { userId, planId, durationDays } = req.body || {};
    if (!userId || !planId || !durationDays) {
      return res.status(400).json({ success: false, error: 'userId, planId, and durationDays are required.' });
    }

    const updatedUser = await dbService.updateUserSubscription(userId, planId, Number(durationDays));
    if (!updatedUser) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Subscription plan assigned to user successfully.',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        subscription_plan_id: updatedUser.subscription_plan_id,
        subscription_expires_at: updatedUser.subscription_expires_at,
        subscription_status: updatedUser.subscription_status,
      }
    });
  }

  /**
   * GET /api/admin/site-settings
   */
  public static async getSiteSettings(req: AuthenticatedRequest, res: Response) {
    dbService.incrementApiRequests();
    const settings = dbService.getSiteSettings();
    return res.status(200).json({ success: true, settings });
  }

  /**
   * POST /api/admin/site-settings
   */
  public static async updateSiteSettings(req: AuthenticatedRequest, res: Response) {
    dbService.incrementApiRequests();
    const updated = await dbService.updateSiteSettings(req.body);
    return res.status(200).json({ success: true, settings: updated });
  }

  /**
   * POST /api/admin/subscription-plans/toggle
   */
  public static async toggleSubscriptionPlan(req: AuthenticatedRequest, res: Response) {
    dbService.incrementApiRequests();
    const { planId } = req.body || {};
    if (!planId) return res.status(400).json({ success: false, error: 'planId is required.' });

    const plan = await dbService.toggleSubscriptionPlan(planId);
    return res.status(200).json({ success: true, plan });
  }
}
