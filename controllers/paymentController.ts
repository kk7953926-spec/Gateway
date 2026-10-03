import { Request, Response } from 'express';
import crypto from 'crypto';
import { PaymentService } from '../services/paymentService.ts';
import { ImapService } from '../services/imapService.ts';
import { EmailService } from '../services/emailService.ts';
import { dbService, UpiPaymentRecord } from '../database/db.ts';
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

      const now = Date.now();
      const expTime = link.expires_at 
        ? new Date(link.expires_at).getTime() 
        : (link.created_at ? new Date(link.created_at).getTime() + (link.expiry_minutes || 8) * 60 * 1000 : now + 480000);
      const secondsLeft = Math.max(0, Math.floor((expTime - now) / 1000));
      const effectiveStatus = (link.status === 'ACTIVE' && secondsLeft <= 0) ? 'EXPIRED' : link.status;

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
          status: effectiveStatus,
          created_at: link.created_at,
          expires_at: link.expires_at,
          expiry_minutes: link.expiry_minutes || 8,
          seconds_left: secondsLeft,
          success_url: link.success_url || merchant?.checkout_settings?.success_url,
          cancel_url: link.cancel_url || merchant?.checkout_settings?.cancel_url,
          custom_settings: merchant?.checkout_settings || {
            brand_name: 'FAMGATEWAY',
            subtitle: 'VERIFIED MERCHANT',
            avatar_url: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80',
            theme_color: 'purple',
            session_timeout_minutes: link.expiry_minutes || 8,
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
      const merchant = await dbService.findUserById(payment.user_id);
      const merchantUpi = payment.upi_id || merchant?.fampay_upi_id || '8056317218@fam';
      const merchantName = merchant?.name || 'FamGateway Merchant';
      const upiUri = `upi://pay?pa=${encodeURIComponent(merchantUpi)}&pn=${encodeURIComponent(merchantName)}&am=${payment.amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(payment.transaction_ref || payment.note || 'Payment')}`;

      const now = Date.now();
      const createdAtMs = payment.created_at ? new Date(payment.created_at).getTime() : now;
      const expTime = createdAtMs + 8 * 60 * 1000;
      const secondsLeft = Math.max(0, Math.floor((expTime - now) / 1000));
      const effectiveStatus = (payment.status === 'PENDING' && secondsLeft <= 0) ? 'EXPIRED' : payment.status;

      const linkData = {
        id: payment.id,
        title: payment.note || 'Payment Order',
        amount: payment.amount,
        description: `Order Ref: ${payment.transaction_ref || payment.id}`,
        merchant_name: merchantName,
        merchant_upi_id: merchantUpi,
        upi_uri: upiUri,
        qr_data_url: payment.qr_data_url,
        status: effectiveStatus,
        created_at: payment.created_at,
        expires_at: new Date(expTime).toISOString(),
        expiry_minutes: 8,
        seconds_left: secondsLeft,
        redirect_url: payment.success_url,
        success_url: payment.success_url,
        cancel_url: payment.cancel_url,
        transaction_ref: payment.transaction_ref,
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
      };

      return res.status(200).json({
        success: true,
        link: linkData,
        payment: linkData,
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
    const { paymentId, utr, amount, since, customer_email, email } = req.body || {};

    if (!paymentId) {
      return res.status(400).json({ success: false, error: 'Payment ID is required.' });
    }

    try {
      const parsedAmount = amount ? parseFloat(amount) : undefined;
      const parsedSince = since ? parseInt(since.toString(), 10) : undefined;
      const targetCustomerEmail = (customer_email || email) ? String(customer_email || email).trim() : undefined;
      const result = await PaymentService.verifyPaymentViaEmailAlert(
        paymentId,
        clientIp,
        utr,
        parsedAmount,
        parsedSince,
        targetCustomerEmail
      );

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
    const since = req.query.since ? parseInt(req.query.since as string, 10) : undefined;
    const customerEmail = (req.query.customer_email || req.query.email) ? String(req.query.customer_email || req.query.email).trim() : undefined;

    try {
      const result = await PaymentService.autoDetectAndConfirm(id, amount, since, customerEmail);
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
   * POST /api/create-order
   * POST /api/v1/order/create
   * GET /api/create-order
   * GET /api/qr.php
   * Enterprise & Quick Query API to create a payment order
   */
  public static async createApiOrder(req: AuthenticatedRequest, res: Response) {
    dbService.incrementApiRequests();
    const source = req.method === 'GET' ? req.query : { ...req.query, ...req.body };
    const { 
      amount, 
      note, 
      title, 
      customer_name, 
      customer_email, 
      redirect_url, 
      success_url, 
      cancel_url 
    } = source || {};

    if (!amount || isNaN(parseFloat(amount as string))) {
      return res.status(400).json({ success: false, error: 'Valid amount is required.' });
    }

    const parsedAmount = parseFloat(amount as string);
    const user = req.user!;
    const platformUpi = user.fampay_upi_id || '8056317218@fam';
    const effectiveSuccessUrl = redirect_url || success_url;
    const orderTitle = note || title || (customer_name ? `Order - ${customer_name}` : `Payment ₹${parsedAmount}`);

    try {
      const { payment, qrCodeUrl, upiUri } = await PaymentService.createUpiPayment(
        user.id,
        user.email,
        platformUpi,
        parsedAmount,
        orderTitle,
        (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
        effectiveSuccessUrl,
        cancel_url
      );

      const origin = `${req.protocol}://${req.get('host')}`;
      const checkoutUrl = `${origin}/pay/${payment.id}`;

      // If requested format is raw QR image
      if (req.query.format === 'image' || req.query.format === 'qr_image') {
        const qrBase64 = qrCodeUrl.replace(/^data:image\/png;base64,/, '');
        const imgBuffer = Buffer.from(qrBase64, 'base64');
        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Content-Length': imgBuffer.length
        });
        return res.end(imgBuffer);
      }

      return res.status(201).json({
        success: true,
        order_id: payment.id,
        amount: payment.amount,
        currency: 'INR',
        customer_name: customer_name || undefined,
        customer_email: customer_email || undefined,
        redirect_url: effectiveSuccessUrl || undefined,
        note: payment.note,
        payment_url: checkoutUrl,
        checkout_url: checkoutUrl,
        merchant_upi_id: platformUpi,
        merchant_name: user.name,
        upi_uri: upiUri,
        qr_data_url: qrCodeUrl,
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
    let payment = await dbService.getPaymentById(id);

    if (!payment) {
      const link = await dbService.getPaymentLinkById(id);
      if (link) {
        if (link.status === 'ACTIVE') {
          await PaymentService.autoDetectAndConfirm(link.id, link.amount);
        }
        return res.status(200).json({
          success: true,
          order_id: link.id,
          amount: link.amount,
          status: link.status === 'CAPTURED' ? 'CONFIRMED' : link.status,
          created_at: link.created_at,
        });
      }
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    // If still pending, actively run auto-detection scanner against Gmail IMAP
    if (payment.status === 'PENDING') {
      const detectRes = await PaymentService.autoDetectAndConfirm(payment.id, payment.amount);
      if (detectRes.status === 'CONFIRMED' && detectRes.payment) {
        payment = detectRes.payment;
      }
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

  /**
   * POST /api/payment/webhook
   * Inbound Webhook Handler to receive real-time asynchronous notifications from payment gateways
   */
  public static async handleGatewayWebhook(req: Request, res: Response) {
    dbService.incrementApiRequests();
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const body = req.body || {};
    const signature = (req.headers['x-gateway-signature'] || req.headers['x-webhook-signature'] || req.headers['x-signature'] || req.headers['signature']) as string | undefined;

    // Support multiple gateway formats:
    // 1. Standard flat: { paymentId, orderId, status, utr, amount }
    // 2. Event-based: { event: 'payment.captured', payload: { payment: { entity: { id, order_id, amount, status, acquirer_data: { rrn } } } } }
    // 3. Nested data: { data: { payment: { payment_id, order_id, status, utr } }, event: 'PAYMENT_SUCCESS' }
    const rawEvent = (body.event || body.type || body.action || '').toString().toLowerCase();

    // Extract payment/order reference
    const rawRef =
      body.paymentId ||
      body.payment_id ||
      body.orderId ||
      body.order_id ||
      body.id ||
      body.transaction_ref ||
      body.txn_id ||
      body.reference_id ||
      body.payload?.payment?.entity?.order_id ||
      body.payload?.payment?.entity?.id ||
      body.data?.payment?.id ||
      body.data?.payment?.payment_id ||
      body.data?.order_id ||
      body.data?.id;

    if (!rawRef) {
      await dbService.addLog({
        action: 'WEBHOOK_REJECTED',
        ip: clientIp,
        status: 'WARNING',
        details: 'Received gateway webhook without payment or order reference.',
      });
      return res.status(400).json({
        success: false,
        error: 'Missing required payment reference in webhook payload (e.g. paymentId, order_id, or transaction_ref).',
      });
    }

    const targetRef = String(rawRef).trim();

    // Extract status & event
    const rawStatus = (
      body.status ||
      body.payment_status ||
      body.order_status ||
      body.payload?.payment?.entity?.status ||
      body.data?.payment?.status ||
      body.data?.status ||
      ''
    ).toString().toUpperCase();

    // Extract UTR / RRN
    const rawUtr =
      body.utr ||
      body.rrn ||
      body.bank_ref_no ||
      body.bank_reference ||
      body.transaction_ref ||
      body.payload?.payment?.entity?.acquirer_data?.rrn ||
      body.payload?.payment?.entity?.acquirer_data?.bank_transaction_id ||
      body.data?.utr ||
      body.data?.payment?.bank_reference;

    const utr = rawUtr ? String(rawUtr).trim() : undefined;

    // Extract amount
    let amount: number | undefined = undefined;
    const rawAmount = body.amount ?? body.payload?.payment?.entity?.amount ?? body.data?.amount ?? body.data?.payment?.amount;
    if (rawAmount !== undefined && !isNaN(Number(rawAmount))) {
      amount = Number(rawAmount);
    }

    // Determine status: is this success or failure?
    const isSuccess =
      rawStatus === 'SUCCESS' ||
      rawStatus === 'CONFIRMED' ||
      rawStatus === 'CAPTURED' ||
      rawStatus === 'PAID' ||
      rawStatus === 'COMPLETED' ||
      rawEvent.includes('success') ||
      rawEvent.includes('captured') ||
      rawEvent.includes('paid') ||
      rawEvent.includes('completed');

    const isFailure =
      rawStatus === 'FAILED' ||
      rawStatus === 'FAILURE' ||
      rawStatus === 'CANCELLED' ||
      rawStatus === 'EXPIRED' ||
      rawEvent.includes('failed') ||
      rawEvent.includes('cancel') ||
      rawEvent.includes('expired');

    // Find payment record or payment link
    let payment = await dbService.getPaymentByRef(targetRef);
    let link: any = null;

    if (!payment) {
      link = await dbService.getPaymentLinkById(targetRef);
    }

    if (!payment && !link) {
      // Also search through all payments in case reference is contained in note
      const allPayments = await dbService.getAllPayments();
      payment = allPayments.find(p => p.id === targetRef || p.transaction_ref === targetRef || (p.note && p.note.includes(targetRef))) || null;
    }

    if (!payment && !link) {
      await dbService.addLog({
        action: 'WEBHOOK_NOT_FOUND',
        ip: clientIp,
        status: 'FAILED',
        details: `Webhook received for unknown transaction reference: ${targetRef}. Payload: ${JSON.stringify(body).slice(0, 200)}`,
      });
      return res.status(404).json({
        success: false,
        error: `Transaction or order not found for reference: ${targetRef}`,
        reference: targetRef,
      });
    }

    // Optional Signature Verification if merchant configured secret
    const merchantId = payment?.user_id || link?.user_id;
    if (merchantId) {
      const merchant = await dbService.findUserById(merchantId);
      if (merchant?.webhook_secret && signature) {
        const expectedSig = crypto
          .createHmac('sha256', merchant.webhook_secret)
          .update(JSON.stringify(body))
          .digest('hex');
        if (signature !== expectedSig && signature !== merchant.webhook_secret) {
          console.warn('[Webhook Signature Mismatch]: provided:', signature, 'expected:', expectedSig);
        }
      }
    }

    // 1. Process SUCCESS notification
    if (isSuccess || (!isFailure && (utr || rawStatus === 'SUCCESS'))) {
      // Check if already confirmed (idempotency guarantee)
      if (payment && payment.status === 'CONFIRMED') {
        await dbService.addLog({
          user_id: payment.user_id,
          user_email: payment.user_email,
          action: 'WEBHOOK_IDEMPOTENT',
          ip: clientIp,
          status: 'INFO',
          details: `Webhook notification received for already confirmed payment ID ${payment.id}. Acknowledged idempotently.`,
        });
        return res.status(200).json({
          success: true,
          message: 'Transaction already confirmed (idempotent)',
          idempotent: true,
          status: 'CONFIRMED',
          transaction_id: payment.id,
          transaction_ref: payment.transaction_ref,
        });
      }

      // Check if UTR is already used by a different transaction
      if (utr && dbService.isUtrAlreadyUsed(utr)) {
        await dbService.addLog({
          user_id: payment?.user_id || link?.user_id,
          action: 'WEBHOOK_DUPLICATE_UTR_BLOCKED',
          ip: clientIp,
          status: 'WARNING',
          details: `Blocked webhook confirmation: UTR ${utr} has already been claimed by another transaction.`,
        });
        return res.status(409).json({
          success: false,
          error: `Duplicate UTR detected: ${utr} has already been registered for another transaction.`,
        });
      }

      let confirmedPayment: UpiPaymentRecord | null = null;

      if (payment) {
        confirmedPayment = await dbService.confirmPayment(payment.id, utr);
      } else if (link) {
        const merchant = await dbService.findUserById(link.user_id);
        confirmedPayment = await dbService.createPaymentRecord({
          transaction_ref: utr || `GW-${Date.now().toString(36).toUpperCase()}`,
          user_id: link.user_id,
          user_email: merchant?.email || 'merchant@famgateway.in',
          upi_id: merchant?.fampay_upi_id || 'merchant@fam',
          amount: amount || link.amount,
          note: link.title,
          qr_data_url: '',
          status: 'CONFIRMED',
          confirmed_at: new Date().toISOString(),
        });
        await dbService.addWalletBalance(link.user_id, confirmedPayment.amount);
        await dbService.updatePaymentLinkStatus(link.id, 'CAPTURED');
      }

      if (!confirmedPayment) {
        return res.status(500).json({
          success: false,
          error: 'Failed to update transaction status in database.',
        });
      }

      // Asynchronously dispatch receipt email
      EmailService.sendPaymentReceiptEmail(
        confirmedPayment.user_email,
        confirmedPayment.amount,
        confirmedPayment.upi_id,
        confirmedPayment.transaction_ref
      ).catch(() => {});

      // Forward merchant outgoing webhook
      PaymentService.triggerWebhook(confirmedPayment).catch(() => {});

      await dbService.addLog({
        user_id: confirmedPayment.user_id,
        user_email: confirmedPayment.user_email,
        action: 'WEBHOOK_PAYMENT_CONFIRMED',
        ip: clientIp,
        status: 'SUCCESS',
        details: `Real-time payment gateway webhook verified! Transaction ${confirmedPayment.id} confirmed. UTR: ${confirmedPayment.transaction_ref}. Amount: ₹${confirmedPayment.amount}.`,
      });

      return res.status(200).json({
        success: true,
        message: 'Transaction status updated to CONFIRMED successfully.',
        transaction_id: confirmedPayment.id,
        transaction_ref: confirmedPayment.transaction_ref,
        amount: confirmedPayment.amount,
        status: 'CONFIRMED',
        confirmed_at: confirmedPayment.confirmed_at,
      });
    }

    // 2. Process FAILURE notification
    if (isFailure) {
      if (payment) {
        await dbService.failPayment(payment.id);
      }

      await dbService.addLog({
        user_id: payment?.user_id || link?.user_id,
        user_email: payment?.user_email,
        action: 'WEBHOOK_PAYMENT_FAILED',
        ip: clientIp,
        status: 'WARNING',
        details: `Payment gateway notified failure for transaction ${targetRef}. Status updated to FAILED.`,
      });

      return res.status(200).json({
        success: true,
        message: 'Transaction status updated to FAILED as notified by gateway.',
        transaction_id: targetRef,
        status: 'FAILED',
      });
    }

    // Default response for unhandled status
    return res.status(200).json({
      success: true,
      message: `Webhook notification acknowledged. Status '${rawStatus || 'UNKNOWN'}' recorded.`,
      transaction_id: targetRef,
      status: payment?.status || 'PENDING',
    });
  }

  /**
   * POST /api/payment/webhook/simulate
   * Test tool for merchants to simulate an incoming gateway webhook
   */
  public static async simulateGatewayWebhook(req: AuthenticatedRequest, res: Response) {
    dbService.incrementApiRequests();
    const { paymentId, status = 'SUCCESS', utr, amount } = req.body || {};

    if (!paymentId) {
      return res.status(400).json({ success: false, error: 'paymentId or orderId is required to simulate.' });
    }

    const mockReq = {
      body: {
        paymentId,
        status,
        utr: utr || `UTR${Date.now().toString().slice(-8)}`,
        amount,
        event: status === 'SUCCESS' ? 'payment.captured' : 'payment.failed',
      },
      headers: req.headers,
      socket: req.socket,
    } as unknown as Request;

    return PaymentController.handleGatewayWebhook(mockReq, res);
  }
}
