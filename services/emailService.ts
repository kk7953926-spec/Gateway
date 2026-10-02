import nodemailer from 'nodemailer';
import { dbService } from '../database/db.ts';

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  simulated?: boolean;
}

export class EmailService {
  /**
   * Generates a professional responsive HTML email template for 16-digit verification code.
   */
  private static generateVerificationHtml(code: string, expiryMinutes: number = 10): string {
    const formattedCode = code.replace(/(\d{4})/g, '$1 ').trim();

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your FamPay X Verification Code</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #090d16;
      color: #e2e8f0;
      line-height: 1.6;
    }
    .container {
      max-width: 580px;
      margin: 40px auto;
      background: #111827;
      border-radius: 16px;
      border: 1px solid rgba(0, 242, 254, 0.2);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(0, 242, 254, 0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #0b1329 0%, #172554 100%);
      padding: 32px 24px;
      text-align: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .brand {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #ffffff;
      text-decoration: none;
    }
    .brand span {
      background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .tagline {
      font-size: 13px;
      color: #94a3b8;
      margin-top: 4px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .content {
      padding: 40px 32px;
    }
    .greeting {
      font-size: 18px;
      font-weight: 600;
      color: #f8fafc;
      margin-bottom: 12px;
    }
    .message {
      font-size: 15px;
      color: #94a3b8;
      margin-bottom: 28px;
    }
    .code-box {
      background: #070a12;
      border: 1px solid #1e293b;
      border-left: 4px solid #00f2fe;
      border-radius: 12px;
      padding: 24px 16px;
      text-align: center;
      margin: 24px 0;
    }
    .code-label {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #38bdf8;
      margin-bottom: 12px;
    }
    .code-display {
      font-family: 'JetBrains Mono', 'Courier New', Courier, monospace;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 4px;
      color: #ffffff;
      text-shadow: 0 0 12px rgba(0, 242, 254, 0.4);
      user-select: all;
    }
    .warning-box {
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 8px;
      padding: 16px;
      margin-top: 28px;
      font-size: 13px;
      color: #fca5a5;
    }
    .footer {
      background: #090d16;
      padding: 24px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      border-top: 1px solid #1e293b;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">FamPay <span>X</span></div>
      <div class="tagline">Enterprise Email Verification Gateway</div>
    </div>
    
    <div class="content">
      <div class="greeting">Security Verification Request</div>
      <div class="message">
        You are completing registration or authentication on FamPay X. Use the 16-digit verification code below to verify your email address.
      </div>

      <div class="code-box">
        <div class="code-label">Your FamPay X verification code is:</div>
        <div class="code-display">${formattedCode}</div>
      </div>

      <div class="warning-box">
        <strong>⚠️ Security Notice:</strong> This code will expire in <strong>${expiryMinutes} minutes</strong>. Never share this code with anyone.
      </div>
    </div>

    <div class="footer">
      <div>&copy; ${new Date().getFullYear()} FamPay X Financial Services Inc. All rights reserved.</div>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generates a professional HTML Payment Receipt email with Amount, Transaction ID, UTR, and Note.
   */
  private static generatePaymentReceiptHtml(
    amount: number,
    upiId: string,
    transactionRef: string,
    utr?: string,
    note?: string,
    merchantName?: string
  ): string {
    const formattedDate = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'medium',
    });

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Confirmed - ₹${amount.toFixed(2)}</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f8fafc; line-height: 1.6; }
    .container { max-width: 580px; margin: 30px auto; background: #111827; border-radius: 20px; border: 1px solid rgba(16, 185, 129, 0.3); overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7); }
    .header { background: linear-gradient(135deg, #064e3b 0%, #022c22 100%); padding: 36px 24px; text-align: center; border-bottom: 1px solid rgba(16, 185, 129, 0.2); }
    .badge { display: inline-block; background: #10b981; color: #022c22; font-weight: 800; font-size: 11px; padding: 6px 16px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 1px; }
    .title { font-size: 22px; font-weight: 800; margin-top: 14px; color: #ffffff; letter-spacing: -0.5px; }
    .merchant { font-size: 13px; color: #a7f3d0; margin-top: 4px; font-weight: 600; }
    .amount-box { padding: 24px 32px 10px; text-align: center; }
    .amount-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; }
    .amount { font-size: 42px; font-weight: 900; color: #34d399; margin: 6px 0; font-family: monospace; letter-spacing: -1px; }
    .content { padding: 10px 32px 32px; }
    .intro { font-size: 14px; color: #cbd5e1; text-align: center; margin-bottom: 24px; }
    .card { background: #070a12; border: 1px solid #1f293d; border-radius: 14px; padding: 20px 24px; font-family: monospace; font-size: 13px; }
    .row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #172033; }
    .row:last-child { border-bottom: none; }
    .label { color: #94a3b8; font-weight: 500; font-size: 12px; }
    .val { color: #f8fafc; font-weight: 700; font-size: 13px; text-align: right; }
    .highlight-utr { color: #38bdf8; font-weight: 800; font-size: 14px; background: rgba(56, 189, 248, 0.1); padding: 2px 8px; border-radius: 6px; }
    .status-ok { color: #34d399; font-weight: 800; }
    .footer { background: #090d16; padding: 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #172033; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">Payment Confirmed ✓</div>
      <div class="title">Payment Successful</div>
      <div class="merchant">Merchant: ${merchantName || 'FamGateway Merchant'}</div>
    </div>

    <div class="amount-box">
      <div class="amount-label">Amount Confirmed</div>
      <div class="amount">₹${amount.toFixed(2)}</div>
    </div>

    <div class="content">
      <div class="intro">
        Your payment has been successfully verified and confirmed. Below are your official transaction and receipt details:
      </div>

      <div class="card">
        <div class="row">
          <span class="label">Amount Paid:</span>
          <span class="val" style="color: #34d399; font-size: 15px;">₹${amount.toFixed(2)} INR</span>
        </div>
        <div class="row">
          <span class="label">Bank UTR Number:</span>
          <span class="val highlight-utr">${utr || 'Auto-Captured'}</span>
        </div>
        <div class="row">
          <span class="label">Transaction ID:</span>
          <span class="val" style="color: #e2e8f0;">${transactionRef}</span>
        </div>
        ${note ? `
        <div class="row">
          <span class="label">Payment Description:</span>
          <span class="val">${note}</span>
        </div>` : ''}
        <div class="row">
          <span class="label">Merchant UPI VPA:</span>
          <span class="val">${upiId}</span>
        </div>
        <div class="row">
          <span class="label">Status:</span>
          <span class="val status-ok">CONFIRMED (SUCCESS ✓)</span>
        </div>
        <div class="row">
          <span class="label">Date & Time:</span>
          <span class="val" style="font-size: 11px;">${formattedDate}</span>
        </div>
      </div>
    </div>

    <div class="footer">
      <div>This is an official automated payment confirmation receipt.</div>
      <div style="margin-top: 6px;">&copy; ${new Date().getFullYear()} FamGateway. All rights reserved.</div>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Checks whether the provided SMTP settings are valid and not a placeholder or local mock.
   */
  private static isValidSmtpConfig(settings: { host?: string; user?: string; pass?: string }): boolean {
    if (!settings.host || !settings.user || !settings.pass) return false;
    const host = settings.host.toLowerCase().trim();
    const user = settings.user.toLowerCase().trim();
    const pass = settings.pass.trim();

    // Check placeholder / dummy domains and local addresses
    if (
      host.includes('example.com') ||
      host.includes('example.org') ||
      host.includes('yourdomain') ||
      host.includes('dummy') ||
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.endsWith('.test') ||
      host.endsWith('.invalid')
    ) {
      return false;
    }

    // Check placeholder usernames
    if (
      user.includes('example.com') ||
      user.includes('example.org') ||
      user === 'user' ||
      user === 'admin'
    ) {
      return false;
    }

    // Check placeholder passwords
    if (
      pass.includes('example') ||
      pass === 'password' ||
      pass === 'your_password' ||
      pass === 'your_smtp_app_password' ||
      pass.length < 6
    ) {
      return false;
    }

    return true;
  }

  /**
   * Resolves effective SMTP settings, falling back to merchant credentials if available.
   */
  private static async getEffectiveSmtpSettings(): Promise<{
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
  } | null> {
    const settings = dbService.getSettings();

    // Look for real merchant credentials as fallback if password not in settings
    let fallbackPass = '';
    let fallbackEmail = '';
    try {
      const users = await dbService.getAllUsers();
      const userWithAppPass = users.find(
        (u) =>
          u.google_app_password &&
          u.google_app_password.trim().length >= 8 &&
          !u.google_app_password.includes('example')
      );
      if (userWithAppPass && userWithAppPass.google_app_password) {
        fallbackPass = userWithAppPass.google_app_password.trim();
        fallbackEmail = (userWithAppPass.fampay_gmail || userWithAppPass.email || '').trim();
      }
    } catch {
      // Ignore
    }

    const effectiveUser =
      (settings.sender_email && settings.sender_email.trim()) ||
      (settings.user && settings.user.trim()) ||
      fallbackEmail;

    const effectivePass =
      (settings.pass && settings.pass.trim().length >= 6 && !settings.pass.includes('example')
        ? settings.pass.trim()
        : null) || fallbackPass;

    const effectiveSenderName =
      (settings.sender_name && settings.sender_name.trim()) ||
      (settings.from && settings.from.includes('"')
        ? settings.from.split('"')[1]
        : 'FamGateway Payments');

    const effectiveFrom = settings.from && settings.from.trim().length > 3
      ? settings.from
      : (effectiveSenderName ? `"${effectiveSenderName}" <${effectiveUser}>` : effectiveUser);

    const effectiveHost = settings.host && !settings.host.includes('example') ? settings.host : 'smtp.gmail.com';
    const effectivePort = settings.port || 465;

    if (effectiveUser && effectivePass) {
      return {
        host: effectiveHost,
        port: effectivePort,
        user: effectiveUser,
        pass: effectivePass,
        from: effectiveFrom,
      };
    }

    return null;
  }

  public static async sendVerificationEmail(
    toEmail: string,
    code: string,
    expiryMinutes: number = 10
  ): Promise<EmailSendResult> {
    const subject = "Your FamPay X Email Verification Code";
    const htmlContent = this.generateVerificationHtml(code, expiryMinutes);
    const smtp = await this.getEffectiveSmtpSettings();

    if (smtp) {
      try {
        const isPort465 = smtp.port === 465;
        const transporter = nodemailer.createTransport({
          host: smtp.host,
          port: smtp.port,
          secure: isPort465,
          auth: { user: smtp.user, pass: smtp.pass },
          tls: { rejectUnauthorized: false },
          connectionTimeout: 6000,
          greetingTimeout: 6000,
          socketTimeout: 6000,
        });

        const info = await transporter.sendMail({
          from: smtp.from,
          to: toEmail,
          subject,
          html: htmlContent,
          text: `Your FamPay X verification code is: ${code}.`,
        });

        return { success: true, messageId: info.messageId, simulated: false };
      } catch (err) {
        console.warn('[SMTP Verification Dispatch]: Notice: Could not send via SMTP, falling back to simulated dispatch:', (err as Error).message);
      }
    }

    console.log(`[FamPay X Email Simulation] Code: ${code} to ${toEmail}`);
    return {
      success: true,
      messageId: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      simulated: true,
    };
  }

  public static async sendPaymentReceiptEmail(
    toEmailOrParams: string | {
      toEmail: string;
      amount: number;
      upiId: string;
      transactionRef: string;
      utr?: string;
      note?: string;
      merchantName?: string;
    },
    amountArg?: number,
    upiIdArg?: string,
    transactionRefArg?: string,
    utrArg?: string,
    noteArg?: string,
    merchantNameArg?: string
  ): Promise<EmailSendResult> {
    let toEmail: string;
    let amount: number;
    let upiId: string;
    let transactionRef: string;
    let utr: string | undefined;
    let note: string | undefined;
    let merchantName: string | undefined;

    if (typeof toEmailOrParams === 'object') {
      toEmail = toEmailOrParams.toEmail;
      amount = toEmailOrParams.amount;
      upiId = toEmailOrParams.upiId;
      transactionRef = toEmailOrParams.transactionRef;
      utr = toEmailOrParams.utr;
      note = toEmailOrParams.note;
      merchantName = toEmailOrParams.merchantName;
    } else {
      toEmail = toEmailOrParams;
      amount = amountArg || 0;
      upiId = upiIdArg || '';
      transactionRef = transactionRefArg || '';
      utr = utrArg;
      note = noteArg;
      merchantName = merchantNameArg;
    }

    const subject = `Payment Confirmed: ₹${amount.toFixed(2)} [Ref: ${utr || transactionRef}]`;
    const htmlContent = this.generatePaymentReceiptHtml(amount, upiId, transactionRef, utr, note, merchantName);
    const smtp = await this.getEffectiveSmtpSettings();

    if (smtp) {
      try {
        const isPort465 = smtp.port === 465;
        const transporter = nodemailer.createTransport({
          host: smtp.host,
          port: smtp.port,
          secure: isPort465,
          auth: { user: smtp.user, pass: smtp.pass },
          tls: { rejectUnauthorized: false },
          connectionTimeout: 8000,
          greetingTimeout: 8000,
          socketTimeout: 8000,
        });

        const info = await transporter.sendMail({
          from: smtp.from,
          to: toEmail,
          subject,
          html: htmlContent,
          text: `Payment Confirmed: ₹${amount.toFixed(2)} has been successfully paid.\nTransaction ID: ${transactionRef}\nBank UTR: ${utr || 'N/A'}\nUPI ID: ${upiId}`,
        });

        console.log(`[SMTP Receipt Delivered] Sent confirmation to ${toEmail}, messageId: ${info.messageId}`);
        return { success: true, messageId: info.messageId, simulated: false };
      } catch (err) {
        const errorMsg = (err as Error).message;
        console.warn('[SMTP Receipt Dispatch]: SMTP Error:', errorMsg);
        return {
          success: false,
          error: errorMsg,
          simulated: false,
        };
      }
    }

    console.log(`[Payment Receipt Simulation] ₹${amount} for ${upiId} Ref: ${transactionRef} to ${toEmail}`);
    return {
      success: true,
      messageId: `receipt_sim_${Date.now()}`,
      simulated: true,
    };
  }
}
