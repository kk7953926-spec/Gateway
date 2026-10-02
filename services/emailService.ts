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
   * Generates a professional HTML Payment Receipt email.
   */
  private static generatePaymentReceiptHtml(
    amount: number,
    upiId: string,
    transactionRef: string
  ): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>FamPay X Payment Confirmation</title>
  <style>
    body { margin: 0; padding: 0; font-family: sans-serif; background: #07090e; color: #f8fafc; }
    .container { max-width: 580px; margin: 30px auto; background: #111827; border-radius: 16px; border: 1px solid rgba(16, 185, 129, 0.3); overflow: hidden; }
    .header { background: linear-gradient(135deg, #064e3b 0%, #022c22 100%); padding: 32px; text-align: center; }
    .badge { background: #10b981; color: #000; font-weight: 800; font-size: 12px; padding: 4px 12px; border-radius: 99px; text-transform: uppercase; }
    .title { font-size: 24px; font-weight: 800; margin-top: 12px; color: #ffffff; }
    .amount { font-size: 36px; font-weight: 800; color: #34d399; margin: 16px 0; font-family: monospace; }
    .box { background: #070a12; border-radius: 12px; padding: 20px; margin: 20px 32px; font-family: monospace; font-size: 13px; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #1e293b; }
    .row:last-child { border-bottom: none; }
    .footer { background: #090d16; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="badge">Payment Confirmed ✓</span>
      <div class="title">FamPay X UPI Transaction Successful</div>
      <div class="amount">₹${amount.toFixed(2)} INR</div>
    </div>
    <div class="box">
      <div class="row"><span style="color:#94a3b8">Transaction Ref:</span><span style="color:#38bdf8">${transactionRef}</span></div>
      <div class="row"><span style="color:#94a3b8">FamPay UPI ID:</span><span style="color:#f8fafc">${upiId}</span></div>
      <div class="row"><span style="color:#94a3b8">Gateway Status:</span><span style="color:#34d399">EMAIL ALERT VERIFIED</span></div>
      <div class="row"><span style="color:#94a3b8">Confirmed At:</span><span>${new Date().toLocaleString()}</span></div>
    </div>
    <div className="footer">
      <div>&copy; ${new Date().getFullYear()} FamPay X Payment Gateway</div>
    </div>
  </div>
</body>
</html>
    `;
  }

  public static async sendVerificationEmail(
    toEmail: string,
    code: string,
    expiryMinutes: number = 10
  ): Promise<EmailSendResult> {
    const settings = dbService.getSettings();
    const subject = "Your FamPay X Email Verification Code";
    const htmlContent = this.generateVerificationHtml(code, expiryMinutes);

    if (settings.host && settings.user && settings.pass) {
      try {
        const transporter = nodemailer.createTransport({
          host: settings.host,
          port: settings.port,
          secure: settings.port === 465,
          auth: { user: settings.user, pass: settings.pass },
          tls: { rejectUnauthorized: false },
        });

        const info = await transporter.sendMail({
          from: settings.from || `"FamPay X Verification" <${settings.user}>`,
          to: toEmail,
          subject,
          html: htmlContent,
          text: `Your FamPay X verification code is: ${code}.`,
        });

        return { success: true, messageId: info.messageId, simulated: false };
      } catch (err) {
        console.error('[SMTP Transport Error]:', (err as Error).message);
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
    toEmail: string,
    amount: number,
    upiId: string,
    transactionRef: string
  ): Promise<EmailSendResult> {
    const settings = dbService.getSettings();
    const subject = `Payment Received on FamPay X - Ref ${transactionRef}`;
    const htmlContent = this.generatePaymentReceiptHtml(amount, upiId, transactionRef);

    if (settings.host && settings.user && settings.pass) {
      try {
        const transporter = nodemailer.createTransport({
          host: settings.host,
          port: settings.port,
          secure: settings.port === 465,
          auth: { user: settings.user, pass: settings.pass },
          tls: { rejectUnauthorized: false },
        });

        const info = await transporter.sendMail({
          from: settings.from || `"FamPay X Payments" <${settings.user}>`,
          to: toEmail,
          subject,
          html: htmlContent,
        });

        return { success: true, messageId: info.messageId, simulated: false };
      } catch (err) {
        console.error('[SMTP Receipt Error]:', (err as Error).message);
      }
    }

    console.log(`[FamPay X Payment Receipt Simulation] ₹${amount} for ${upiId} Ref: ${transactionRef}`);
    return {
      success: true,
      messageId: `receipt_sim_${Date.now()}`,
      simulated: true,
    };
  }
}
