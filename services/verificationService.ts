import { generateSecure16DigitCode, hashVerificationCode, verifyCodeHash } from '../utils/cryptoUtils.ts';
import { dbService, VerificationRecord } from '../database/db.ts';
import { EmailService } from './emailService.ts';

export class VerificationService {
  /**
   * Generates a secure 16-digit code, hashes it, stores it in the DB, and emails the user.
   */
  public static async generateAndSendCode(
    userId: string,
    email: string,
    ip: string
  ): Promise<{ success: boolean; expiresAt: number; simulated?: boolean; message?: string }> {
    const settings = dbService.getSettings();
    const expiryMinutes = settings.codeExpiryMinutes || 10;
    const maxAttempts = settings.maxAttempts || 5;

    // Cryptographically secure 16-digit numeric generation
    const rawCode = generateSecure16DigitCode();
    const codeHash = hashVerificationCode(rawCode);
    const expiresAt = Date.now() + expiryMinutes * 60 * 1000;

    // Create database record with hashed code ONLY
    const verRecord = await dbService.createVerification({
      user_id: userId,
      user_email: email,
      code_hash: codeHash,
      expires_at: expiresAt,
      attempts: 0,
      max_attempts: maxAttempts,
      used: false,
    });

    // Send email via Nodemailer / SMTP
    const emailRes = await EmailService.sendVerificationEmail(email, rawCode, expiryMinutes);

    // Audit log
    await dbService.addLog({
      user_id: userId,
      user_email: email,
      action: 'GENERATE_VERIFICATION_CODE',
      ip,
      status: 'SUCCESS',
      details: `Generated 16-digit code ID ${verRecord.id}. Expiry: ${expiryMinutes}m. Simulated: ${emailRes.simulated}`,
    });

    return {
      success: true,
      expiresAt,
      simulated: emailRes.simulated,
      message: 'Verification code dispatched to your email address.',
    };
  }

  /**
   * Verifies the 16-digit code against the active database record.
   */
  public static async verifyCode(
    userId: string,
    code: string,
    ip: string
  ): Promise<{ success: boolean; message: string }> {
    // Sanitize input code
    const cleanCode = code.replace(/[\s-]/g, '');

    if (!/^\d{16}$/.test(cleanCode)) {
      await dbService.addLog({
        user_id: userId,
        action: 'VERIFY_EMAIL_FAILED',
        ip,
        status: 'FAILED',
        details: 'Submitted invalid code format (must be exactly 16 digits).',
      });
      await dbService.recordFailedAttempt();
      return {
        success: false,
        message: 'Invalid code format. Verification code must be exactly 16 numeric digits.',
      };
    }

    // Retrieve active code record
    const activeVer = await dbService.getActiveVerification(userId);

    if (!activeVer) {
      await dbService.addLog({
        user_id: userId,
        action: 'VERIFY_EMAIL_FAILED',
        ip,
        status: 'FAILED',
        details: 'No active or non-expired verification code found for user.',
      });
      await dbService.recordFailedAttempt();
      return {
        success: false,
        message: 'Verification code expired or invalid. Please request a new code.',
      };
    }

    // Check attempts limit
    if (activeVer.attempts >= activeVer.max_attempts) {
      activeVer.used = true;
      await dbService.updateVerification(activeVer);

      await dbService.addLog({
        user_id: userId,
        user_email: activeVer.user_email,
        action: 'VERIFY_EMAIL_BLOCKED',
        ip,
        status: 'WARNING',
        details: `Exceeded maximum verification attempts (${activeVer.max_attempts}). Code invalidated.`,
      });
      await dbService.recordFailedAttempt();

      return {
        success: false,
        message: 'Maximum verification attempts exceeded. Please request a new 16-digit code.',
      };
    }

    // Increment attempt counter
    activeVer.attempts += 1;

    // Check code hash in constant time
    const isMatch = verifyCodeHash(cleanCode, activeVer.code_hash);

    if (isMatch) {
      // Mark code as used
      activeVer.used = true;
      await dbService.updateVerification(activeVer);

      // Update user as verified
      await dbService.updateUserVerified(userId);
      await dbService.recordSuccessfulVerification();

      await dbService.addLog({
        user_id: userId,
        user_email: activeVer.user_email,
        action: 'VERIFY_EMAIL_SUCCESS',
        ip,
        status: 'SUCCESS',
        details: `Successfully verified 16-digit code on attempt ${activeVer.attempts}.`,
      });

      return {
        success: true,
        message: 'Email address verified successfully!',
      };
    } else {
      await dbService.updateVerification(activeVer);
      await dbService.recordFailedAttempt();

      const remaining = activeVer.max_attempts - activeVer.attempts;

      await dbService.addLog({
        user_id: userId,
        user_email: activeVer.user_email,
        action: 'VERIFY_EMAIL_FAILED',
        ip,
        status: 'FAILED',
        details: `Incorrect code attempt ${activeVer.attempts}/${activeVer.max_attempts}.`,
      });

      if (remaining <= 0) {
        activeVer.used = true;
        await dbService.updateVerification(activeVer);
        return {
          success: false,
          message: 'Incorrect code. Maximum verification attempts exceeded. Please request a new code.',
        };
      }

      return {
        success: false,
        message: `Incorrect verification code. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.`,
      };
    }
  }
}
