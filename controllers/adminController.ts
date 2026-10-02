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
    return res.status(200).json({
      success: true,
      settings: {
        host: settings.host,
        port: settings.port,
        user: settings.user,
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
    const { host, port, user, pass, from, sendgridKey, maxAttempts, codeExpiryMinutes, rateLimitPerMin } =
      req.body || {};

    const updated = dbService.updateSettings({
      ...(host && { host: host.toString() }),
      ...(port && { port: parseInt(port.toString(), 10) }),
      ...(user && { user: user.toString() }),
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
      details: 'Admin updated SMTP and gateway configuration.',
    });

    return res.status(200).json({
      success: true,
      message: 'System and SMTP settings updated successfully.',
      settings: {
        host: updated.host,
        port: updated.port,
        user: updated.user,
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
    const { testEmail } = req.body || {};
    const targetEmail = testEmail || req.user?.email || 'admin@fampayx.com';

    const testCode = '4829173056148273';
    const emailRes = await EmailService.sendVerificationEmail(targetEmail, testCode, 10);

    return res.status(200).json({
      success: true,
      message: `Test email dispatched to ${targetEmail}`,
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

    const updatedUser = dbService.updateUserSubscription(userId, planId, Number(durationDays));
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
}
