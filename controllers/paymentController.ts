import { Request, Response } from 'express';
import { PaymentService } from '../services/paymentService.ts';
import { ImapService } from '../services/imapService.ts';
import { dbService } from '../database/db.ts';
import { AuthenticatedRequest } from '../middleware/authMiddleware.ts';

export class PaymentController {
  /**
   * GET /api/payment/public-link/:id
   * Public endpoint to fetch details of a payment link / checkout order for customers
   */
  public static async getPublicLinkDetails(req: Request, res: Response) {
    dbService.incrementApiRequests();
    const { id } = req.params;

    // Check payment links map
    const link = await dbService.getPaymentLinkById(id);
    if (link) {
      const merchant = await dbService.findUserById(link.user_id);
      const merchantUpi = merchant?.fampay_upi_id || 'kalamakash@fam';
      const merchantName = merchant?.name || 'FamGateway Merchant';

      // Generate dynamic UPI URI & QR Code
      const note = link.title || 'FamGateway Payment';
      const upiUri = `upi://pay?pa=${encodeURIComponent(merchantUpi)}&pn=${encodeURIComponent(merchantName)}&am=${link.amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`;

      return res.status(200).json({
        success: true,
        link: {
          id: link.id,
          title: link.title,
          amount: link.amount,
          description: link.description || '',
          merchant_name: merchantName,
          merchant_upi_id: merchantUpi,
          upi_uri: upiUri,
          status: link.status,
          success_url: link.success_url || merchant?.checkout_settings?.success_url,
          cancel_url: link.cancel_url || merchant?.checkout_settings?.cancel_url,
          custom_settings: merchant?.checkout_settings || {
            brand_name: 'FAMGATEWAY',
            subtitle: 'VERIFIED MERCHANT',
            avatar_url: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80',
            theme_color: 'purple',
            session_timeout_minutes: 8,
            enable_utr_submission: true,
            enable_save_qr: true,
            show_apps: true,
          },
        },
      });
    }

    // Check payments map
    const payment = await dbService.getPaymentById(id);
    if (payment) {
      return res.status(200).json({
        success: true,
        payment: {
          id: payment.id,
          title: payment.note,
          amount: payment.amount,
          merchant_upi_id: payment.upi_id,
          upi_uri: `upi://pay?pa=${encodeURIComponent(payment.upi_id)}&am=${payment.amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(payment.note)}`,
          status: payment.status,
          success_url: payment.success_url,
          cancel_url: payment.cancel_url,
        },
      });
    }

    // Fallback default demo link
    return res.status(200).json({
      success: true,
      link: {
        id,
        title: 'UPI Checkout Order',
        amount: 100.0,
        description: 'FamGateway.in Zero-Fee UPI Payment',
        merchant_name: 'Kalam Akash',
        merchant_upi_id: 'kalamakash@fam',
        upi_uri: `upi://pay?pa=kalamakash@fam&pn=Kalam%20Akash&am=100.00&cu=INR&tn=Order%20Payment`,
        status: 'ACTIVE',
      },
    });
  }

  /**
   * POST /api/payment/create-qr
   * Receives FamPay UPI ID & Amount, generates dynamic UPI QR Code
   */
  public static async createQr(req: AuthenticatedRequest, res: Response) {
    dbService.incrementApiRequests();
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const { upiId, amount, note, success_url, cancel_url } = req.body || {};

    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    if (!upiId || !upiId.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid FamPay UPI ID (e.g. username@fampay or merchant@upi).',
      });
    }

    const payAmount = parseFloat(amount) || 100;
    if (payAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Payment amount must be greater than 0.',
      });
    }

    try {
      const result = await PaymentService.createUpiPayment(
        req.user.id,
        req.user.email,
        upiId,
        payAmount,
        note || 'FamPay X Gateway Order',
        clientIp,
        success_url,
        cancel_url
      );

      return res.status(201).json({
        success: true,
        message: 'Dynamic FamPay UPI QR Code generated successfully.',
        payment: result.payment,
        qrCodeUrl: result.qrCodeUrl,
        upiUri: result.upiUri,
      });
    } catch (e) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate QR Code: ' + (e as Error).message,
      });
    }
  }

  /**
   * POST /api/payment/verify-email-alert
   * Verifies incoming email payment notification alert and confirms payment
   */
  public static async verifyEmailAlert(req: Request, res: Response) {
    dbService.incrementApiRequests();
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const { paymentId, utr, amount } = req.body || {};

    if (!paymentId) {
      return res.status(400).json({ success: false, error: 'Payment ID is required.' });
    }

    try {
      const parsedAmount = amount ? parseFloat(amount) : undefined;
      const result = await PaymentService.verifyPaymentViaEmailAlert(paymentId, clientIp, utr, parsedAmount);

      if (!result.success) {
        return res.status(400).json({ success: false, error: result.message });
      }

      return res.status(200).json({
        success: true,
        message: result.message,
        payment: result.payment,
      });
    } catch (e) {
      return res.status(500).json({
        success: false,
        error: 'Error verifying payment email alert: ' + (e as Error).message,
      });
    }
  }

  /**
   * GET /api/payment/auto-detect/:id
   * Actively scans Gmail IMAP in the background and auto-confirms payment when email arrives!
   */
  public static async autoDetect(req: Request, res: Response) {
    dbService.incrementApiRequests();
    const { id } = req.params;
    const amount = req.query.amount ? parseFloat(req.query.amount as string) : undefined;

    try {
      const result = await PaymentService.autoDetectAndConfirm(id, amount);
      return res.status(200).json({
        success: true,
        status: result.status,
        message: result.message,
        payment: result.payment,
      });
    } catch {
      return res.status(200).json({ success: true, status: 'PENDING' });
    }
  }

  /**
   * GET /api/payment/status/:id
   */
  public static async getStatus(req: Request, res: Response) {
    dbService.incrementApiRequests();
    const { id } = req.params;
    const payment = await dbService.getPaymentById(id);

    if (!payment) {
      const link = await dbService.getPaymentLinkById(id);
      if (link) {
        return res.status(200).json({
          success: true,
          status: 'PENDING',
          payment: { id: link.id, status: 'PENDING', amount: link.amount, title: link.title },
        });
      }

      return res.status(200).json({
        success: true,
        status: 'PENDING',
        payment: { id, status: 'PENDING' },
      });
    }

    return res.status(200).json({
      success: true,
      status: payment.status,
      payment,
    });
  }

  /**
   * GET /api/payment/my-payments
   */
  public static async getMyPayments(req: AuthenticatedRequest, res: Response) {
    dbService.incrementApiRequests();
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const list = await dbService.getPaymentsByUserId(req.user.id);
    return res.status(200).json({
      success: true,
      payments: list,
    });
  }

  /**
   * GET /api/admin/payments
   */
  public static async getAllPayments(req: AuthenticatedRequest, res: Response) {
    dbService.incrementApiRequests();
    const list = await dbService.getAllPayments();
    return res.status(200).json({
      success: true,
      payments: list,
    });
  }

  /**
   * GET /api/payment/checkout-settings
   */
  public static async getCheckoutSettings(req: AuthenticatedRequest, res: Response) {
    dbService.incrementApiRequests();
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const user = await dbService.findUserById(req.user.id);
    const settings = user?.checkout_settings || {
      brand_name: 'UNKNOWN GATEWAY',
      subtitle: 'VERIFIED MERCHANT',
      avatar_url: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80',
      theme_color: 'purple',
      session_timeout_minutes: 8,
      contact_url: 'https://wa.me/911234567890',
      enable_utr_submission: true,
      enable_save_qr: true,
      show_apps: true,
    };

    return res.status(200).json({
      success: true,
      settings,
    });
  }

  /**
   * POST /api/payment/checkout-settings
   */
  public static async updateCheckoutSettings(req: AuthenticatedRequest, res: Response) {
    dbService.incrementApiRequests();
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { settings } = req.body || {};
    if (!settings) {
      return res.status(400).json({ success: false, error: 'Settings payload is required' });
    }

    const updated = await dbService.updateCheckoutSettings(req.user.id, settings);

    return res.status(200).json({
      success: true,
      message: 'Checkout design settings saved successfully!',
      settings: updated,
    });
  }

  /**
   * GET /api/payment/diagnostic-logs
   */
  public static async getDiagnosticLogs(req: AuthenticatedRequest, res: Response) {
    dbService.incrementApiRequests();
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const user = await dbService.findUserById(req.user.id);
    const logs = await dbService.getLogsByUserId(req.user.id);

    const targetEmail = user?.fampay_gmail || user?.email || 'kk7953926@gmail.com';
    const imapServer = user?.imap_host || ImapService.resolveHost(targetEmail);
    const imapPort = user?.imap_port || 993;
    const hasPass = Boolean(user?.google_app_password && user.google_app_password.replace(/\s+/g, '').length >= 8);
    const isConnected = Boolean(user?.imap_connected && hasPass);

    return res.status(200).json({
      success: true,
      imap_status: {
        configured: Boolean(targetEmail && hasPass),
        connected: isConnected,
        email: targetEmail,
        mail_server: imapServer,
        mail_port: imapPort,
        upi_id: user?.fampay_upi_id || 'kalamakash@fam',
        last_synced: user?.imap_last_synced || null,
        app_password_set: hasPass,
      },
      logs: logs.slice(0, 50),
    });
  }

  /**
   * POST /api/payment/run-diagnostics
   */
  public static async runDiagnostics(req: AuthenticatedRequest, res: Response) {
    dbService.incrementApiRequests();
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const user = await dbService.findUserById(req.user.id);
    const targetEmail = user?.fampay_gmail || user?.email;

    if (!user || !targetEmail || !user.google_app_password) {
      await dbService.addLog({
        user_id: req.user.id,
        user_email: req.user.email,
        action: 'IMAP_DIAGNOSTIC_CHECK',
        ip: clientIp,
        status: 'WARNING',
        details: 'Diagnostic check skipped: Email App Password is not configured in Integrations.',
      });

      return res.status(400).json({
        success: false,
        error: `Please enter the App Password for your email (${targetEmail || user?.email}) in the Integrations tab.`,
      });
    }

    const host = user.imap_host || ImapService.resolveHost(targetEmail);
    const port = user.imap_port || 993;
    const startTime = Date.now();
    const testResult = await ImapService.testConnection(targetEmail, user.google_app_password, host, port);
    const latencyMs = Date.now() - startTime;

    if (!testResult.success) {
      await dbService.addLog({
        user_id: user.id,
        user_email: user.email,
        action: 'IMAP_DIAGNOSTIC_CHECK',
        ip: clientIp,
        status: 'FAILED',
        details: `Diagnostic SSL Connection to ${host}:${port} failed (${latencyMs}ms): ${testResult.message}`,
      });

      return res.status(200).json({
        success: false,
        diagnostic: {
          user_email: targetEmail,
          server: `${host}:${port} (TLS/SSL)`,
          latency_ms: latencyMs,
          status: 'CONNECTION_FAILED',
          message: testResult.message,
          timestamp: new Date().toISOString(),
          fix_suggestion:
            'Verify 1) 2-Step Verification is ON, 2) App Password is 16 chars from myaccount.google.com/apppasswords, 3) IMAP is enabled in your email settings.',
        },
      });
    }

    await dbService.addLog({
      user_id: user.id,
      user_email: user.email,
      action: 'IMAP_DIAGNOSTIC_CHECK',
      ip: clientIp,
      status: 'SUCCESS',
      details: `Diagnostic IMAP ping to ${host}:${port} for ${targetEmail} succeeded (${latencyMs}ms). INBOX total: ${testResult.totalEmails || 0}.`,
    });

    return res.status(200).json({
      success: true,
      diagnostic: {
        user_email: targetEmail,
        server: `${host}:${port} (TLS/SSL)`,
        latency_ms: latencyMs,
        status: 'HEALTHY_AND_CONNECTED',
        total_emails_in_inbox: testResult.totalEmails || 0,
        message: testResult.message,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * POST /api/payment/simulate-email
   * Simulates email alert parsing end-to-end for verification testing.
   */
  public static async simulateEmailParser(req: Request, res: Response) {
    dbService.incrementApiRequests();
    const { subject, from, body, amount, utr, transactionRef } = req.body || {};

    if (!subject || !from || !body || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Simulation fields (Subject, From Address, Body Text, Target Amount) are all required.'
      });
    }

    try {
      const targetAmount = parseFloat(amount);
      const parseResult = ImapService.parseEmailBodyAndSubject(
        subject,
        from,
        body,
        targetAmount,
        utr,
        transactionRef
      );

      return res.status(200).json({
        success: true,
        simulation: {
          parsed: parseResult,
          matched: parseResult.isMatch,
          explanation: parseResult.isMatch 
            ? `✓ Match Succeeded! Extracted Transaction ID: ${parseResult.extractedTxnId || 'N/A'}, Extracted UTR: ${parseResult.extractedUtr || 'N/A'}`
            : `✗ Match Failed. Check if the amount (₹${targetAmount.toFixed(2)}) is mentioned in the email body, or if the sender / keywords match a valid payment format.`
        }
      });
    } catch (e) {
      return res.status(500).json({
        success: false,
        error: 'Simulation engine error: ' + (e as Error).message
      });
    }
  }

  /**
   * POST /api/payment/subscription-checkout
   */
  public static async createSubscriptionCheckout(req: AuthenticatedRequest, res: Response) {
    dbService.incrementApiRequests();
    const { planId } = req.body || {};

    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    if (!planId) {
      return res.status(400).json({ success: false, error: 'planId is required.' });
    }

    const plans = dbService.getSubscriptionPlans();
    const plan = plans.find((p) => p.id === planId);

    if (!plan) {
      return res.status(404).json({ success: false, error: 'Subscription plan not found.' });
    }

    const platformUpi = process.env.PLATFORM_UPI_ID || 'kalamakash@fam';
    const note = `Sub: ${planId}`;

    const { payment, qrCodeUrl, upiUri } = await PaymentService.createUpiPayment(
      req.user.id,
      req.user.email,
      platformUpi,
      plan.price,
      note,
      '127.0.0.1'
    );

    return res.status(200).json({
      success: true,
      payment,
      qrCodeUrl,
      upiUri,
      planName: plan.name,
      price: plan.price,
    });
  }

  /**
   * POST /api/v1/order/create
   * Enterprise API to create a payment order
   */
  public static async createApiOrder(req: AuthenticatedRequest, res: Response) {
    dbService.incrementApiRequests();
    const { amount, note, customer_name, success_url, cancel_url } = req.body || {};

    if (!amount || isNaN(parseFloat(amount))) {
      return res.status(400).json({ success: false, error: 'Valid amount is required.' });
    }

    const user = req.user!;
    const platformUpi = user.fampay_upi_id || 'merchant@fam';

    try {
      const { payment, qrCodeUrl, upiUri } = await PaymentService.createUpiPayment(
        user.id,
        user.email,
        platformUpi,
        parseFloat(amount),
        note || 'API Order',
        (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
        success_url,
        cancel_url
      );

      const checkoutUrl = `${process.env.APP_URL || ''}/pay/${payment.id}`;

      return res.status(201).json({
        success: true,
        order_id: payment.id,
        amount: payment.amount,
        currency: 'INR',
        note: payment.note,
        payment_url: checkoutUrl,
        upi_uri: upiUri,
        qr_code: qrCodeUrl,
        status: payment.status,
      });
    } catch (e) {
      return res.status(500).json({ success: false, error: (e as Error).message });
    }
  }

  /**
   * GET /api/v1/order/status/:id
   */
  public static async getApiOrderStatus(req: AuthenticatedRequest, res: Response) {
    dbService.incrementApiRequests();
    const { id } = req.params;
    const payment = await dbService.getPaymentById(id);

    if (!payment || payment.user_id !== req.user!.id) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    return res.status(200).json({
      success: true,
      order_id: payment.id,
      transaction_ref: payment.transaction_ref,
      amount: payment.amount,
      status: payment.status,
      confirmed_at: payment.confirmed_at,
      created_at: payment.created_at,
    });
  }
}
