import QRCode from 'qrcode';
import crypto from 'crypto';
import { dbService, UpiPaymentRecord } from '../database/db.ts';
import { EmailService } from './emailService.ts';
import { ImapService } from './imapService.ts';

export class PaymentService {
  private static inFlightScans: Map<string, Promise<{ status: 'PENDING' | 'CONFIRMED'; message?: string; payment?: UpiPaymentRecord | null }>> = new Map();

  /**
   * Generates a dynamic UPI payment QR code for a FamPay UPI ID.
   */
  public static async createUpiPayment(
    userId: string,
    userEmail: string,
    upiId: string,
    amount: number,
    note: string = 'FamPay X Gateway Payment',
    ip: string = '127.0.0.1',
    successUrl?: string,
    cancelUrl?: string,
    sourceTag: 'API_ONLY' | 'MERCHANT_LINK' = 'API_ONLY'
  ): Promise<{ payment: UpiPaymentRecord; qrCodeUrl: string; upiUri: string }> {
    const cleanUpi = upiId.trim().toLowerCase();

    // Generate unique transaction reference
    const transactionRef = `FGW-TXN-${Math.floor(100000 + Math.random() * 900000)}`;

    // Build standard UPI URI
    const upiUri = `upi://pay?pa=${cleanUpi}&pn=${encodeURIComponent(
      'FAMGATEWAY'
    )}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(transactionRef)}`;

    // Render standard high-contrast scannable QR code
    const qrCodeUrl = await QRCode.toDataURL(upiUri, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 400,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    // Save payment record to DB flagged as API_ONLY or MERCHANT_LINK
    const payment = await dbService.createPaymentRecord({
      transaction_ref: transactionRef,
      user_id: userId,
      user_email: userEmail,
      upi_id: cleanUpi,
      amount,
      note,
      qr_data_url: qrCodeUrl,
      status: 'PENDING',
      source: sourceTag,
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    // Save user's UPI ID in profile
    await dbService.updateUserUpiId(userId, cleanUpi);

    await dbService.addLog({
      user_id: userId,
      user_email: userEmail,
      action: 'CREATE_UPI_PAYMENT_QR',
      ip,
      status: 'SUCCESS',
      details: `Generated QR code for UPI ID ${cleanUpi}. Amount: ₹${amount} INR. Ref: ${transactionRef}`,
    });

    return { payment, qrCodeUrl, upiUri };
  }

  /**
   * Verifies incoming email payment notification alert via REAL Gmail IMAP login.
   */
  public static async verifyPaymentViaEmailAlert(
    paymentId: string,
    ip: string = '127.0.0.1',
    utr?: string,
    providedAmount?: number,
    since?: number,
    customerEmail?: string
  ): Promise<{ success: boolean; payment: UpiPaymentRecord | null; message: string }> {
    let payment = await dbService.getPaymentById(paymentId);
    let link: any = null;

    if (!payment) {
      link = await dbService.getPaymentLinkById(paymentId);
    }

    let user: any = null;
    let amount = providedAmount || 100;
    let targetRef = paymentId;

    if (payment) {
      user = await dbService.findUserById(payment.user_id);
      amount = payment.amount;
      targetRef = payment.transaction_ref;
    } else if (link) {
      user = await dbService.findUserById(link.user_id);
      amount = link.amount;
      targetRef = link.id;
    }

    // Fallback: If payment or link was not in memory (e.g. after server restart or demo checkout)
    if (!user) {
      const allUsers = await dbService.getAllUsers();
      user =
        allUsers.find(
          (u) => Boolean(u.google_app_password && u.google_app_password.replace(/\s+/g, '').length >= 8)
        ) || (await dbService.findUserByEmail('kk7953926@gmail.com')) || (await dbService.findUserById('usr_kk'));
    }

    const emailToUse = user?.fampay_gmail || user?.email;
    const cleanUtr = (utr || '').replace(/[^a-zA-Z0-9]/g, '').trim();

    const hasAppPassword = Boolean(user && user.google_app_password && user.google_app_password.trim().length >= 8);

    // Calculate strictly scoped session timestamp to reject older emails from prior sessions!
    const minTimestamp = since
      ? since
      : (payment ? new Date(payment.created_at).getTime() : (link ? new Date(link.created_at).getTime() : Date.now() - 5 * 60 * 1000));

    const allPayments = await dbService.getAllPayments();
    const usedUtrs = allPayments.map((p) => p.transaction_ref).filter(Boolean);

    // If customer provided a UTR, verify that it hasn't already been used in another order!
    if (cleanUtr && cleanUtr.length >= 8 && usedUtrs.includes(cleanUtr)) {
      return {
        success: false,
        payment,
        message: `Payment NOT verified. Bank UTR "${cleanUtr}" was already claimed for a previous transaction. Please complete a new payment.`,
      };
    }

    // Perform Email IMAP verification with timestamp and used-UTR protections
    let imapResult: any = { success: false, message: '', utr: cleanUtr || '', transactionId: cleanUtr || targetRef };
    
    if (hasAppPassword) {
      try {
        imapResult = await ImapService.verifyLiveEmailAlert(
          emailToUse,
          user.google_app_password,
          amount,
          targetRef,
          cleanUtr || undefined,
          user.imap_host,
          user.imap_port,
          minTimestamp,
          usedUtrs
        );
      } catch (err: any) {
        imapResult = { success: false, message: err.message || 'IMAP error', utr: cleanUtr || '', transactionId: targetRef };
      }
    } else {
      imapResult = {
        success: false,
        message: 'Gmail IMAP App Password is not configured on merchant profile. 24/7 bank verification requires a valid Google App Password in Integrations.',
      };
    }

    const isImapVerified = Boolean(imapResult && imapResult.success && imapResult.utr);

    // STRICT ANTI-FAKE VERIFICATION: Payment MUST be confirmed by genuine bank email via IMAP.
    // Never allow arbitrary unverified manual UTRs to confirm transactions!
    if (!isImapVerified) {
      await dbService.addLog({
        user_id: user?.id || 'system',
        user_email: user?.email || 'merchant',
        action: 'UPI_PAYMENT_VERIFY_REJECTED',
        ip,
        status: 'FAILED',
        details: `Rejected unverified payment attempt for Ref ${targetRef}: ${imapResult.message || 'No matching bank credit email found in INBOX'}`,
      });

      return {
        success: false,
        payment,
        message: cleanUtr
          ? `Payment NOT verified. Bank records show no credit of ₹${amount} with UTR "${cleanUtr}". Please check your payment receipt or allow a few moments for the bank alert.`
          : (imapResult.message || `No payment receipt detected in Gmail yet for ₹${amount}. If you have paid, please enter your 12-digit Bank UTR number to verify.`),
      };
    }

    // Confirm payment in database (backed by REAL IMAP verification)
    let confirmedPayment: UpiPaymentRecord | null = null;
    const confirmedUtr = imapResult.utr || cleanUtr;

    if (payment) {
      payment.transaction_ref = confirmedUtr;
      confirmedPayment = await dbService.confirmPayment(payment.id);
    } else if (link) {
      confirmedPayment = await dbService.createPaymentRecord({
        transaction_ref: confirmedUtr,
        user_id: user.id,
        user_email: user.email,
        upi_id: user.fampay_upi_id || 'merchant@fam',
        amount: link.amount,
        note: link.title,
        qr_data_url: '',
        status: 'CONFIRMED',
        confirmed_at: new Date().toISOString(),
      });
      await dbService.addWalletBalance(user.id, link.amount);
      await dbService.updatePaymentLinkStatus(link.id, 'CAPTURED');
    }

    if (!confirmedPayment) {
      return { success: false, payment: null, message: 'Failed to update payment status in database.' };
    }

    // Auto-activate subscription if payment is for a subscription plan
    if (confirmedPayment.note && (confirmedPayment.note.includes('Sub:') || confirmedPayment.note.toLowerCase().includes('subscription') || confirmedPayment.note.toLowerCase().includes('plan'))) {
      const planId = confirmedPayment.note.replace('Sub:', '').trim();
      const plans = dbService.getSubscriptionPlans();
      const matchedPlan = plans.find(p => p.id === planId || p.name.toLowerCase() === planId.toLowerCase()) || plans[0];
      const days = matchedPlan ? matchedPlan.duration_days : 30;

      await dbService.updateUserSubscription(confirmedPayment.user_id, matchedPlan ? matchedPlan.id : 'Pro Plan', days);
      console.log(`[Subscription Engine]: Auto-activated subscription for user ${confirmedPayment.user_id} (+${days} days)!`);
    }

    // Trigger Webhook async
    PaymentService.triggerWebhook(confirmedPayment).catch(() => {});

    // Dispatch automated Payment Confirmation Receipt email to user
    const targetRecipient = customerEmail || confirmedPayment.user_email || user.email;
    if (targetRecipient) {
      EmailService.sendPaymentReceiptEmail({
        toEmail: targetRecipient,
        amount: confirmedPayment.amount,
        upiId: confirmedPayment.upi_id || user.fampay_upi_id || 'merchant@fam',
        transactionRef: confirmedPayment.id,
        utr: confirmedUtr,
        note: confirmedPayment.note,
        merchantName: user.name || 'FamGateway Merchant',
      }).catch((e) => console.error('[Receipt Email Error]:', e));
    }

    await dbService.addLog({
      user_id: confirmedPayment.user_id,
      user_email: confirmedPayment.user_email,
      action: isImapVerified ? 'UPI_PAYMENT_CONFIRMED_VIA_IMAP' : 'UPI_PAYMENT_CONFIRMED_VIA_UTR',
      ip,
      status: 'SUCCESS',
      details: `${isImapVerified ? 'REAL FamPay Gmail IMAP alert' : 'Bank UTR Reference'} verified! UTR: ${confirmedPayment.transaction_ref}. Txn: ${imapResult.transactionId || 'N/A'}. ₹${confirmedPayment.amount} credited.`,
    });

    return {
      success: true,
      payment: confirmedPayment,
      message: isImapVerified
        ? `REAL FamPay IMAP Verified! Payment of ₹${confirmedPayment.amount} INR captured. Bank UTR: ${confirmedPayment.transaction_ref}`
        : `Payment Verified & Confirmed! Bank UTR: ${confirmedPayment.transaction_ref}. ₹${confirmedPayment.amount} credited.`,
    };
  }

  /**
   * Automatic Real-Time IMAP Background Scanner.
   * Called during public checkout polling to detect FamPay payment email automatically without any user interaction!
   */
  public static async autoDetectAndConfirm(
    paymentId: string,
    providedAmount?: number,
    since?: number,
    customerEmail?: string
  ): Promise<{ status: 'PENDING' | 'CONFIRMED'; message?: string; payment?: UpiPaymentRecord | null }> {
    let payment = await dbService.getPaymentById(paymentId);
    let link: any = null;

    if (payment && payment.status === 'CONFIRMED') {
      return { status: 'CONFIRMED', payment };
    }

    if (!payment) {
      link = await dbService.getPaymentLinkById(paymentId);
      if (link && link.status === 'CAPTURED') {
        const existingPayments = await dbService.getPaymentsByUserId(link.user_id);
        const matched = existingPayments.find((p) => p.note === link.title && p.status === 'CONFIRMED');
        return { status: 'CONFIRMED', payment: matched || null };
      }
    }

    let user: any = null;
    let amount = providedAmount || 100;
    let targetRef = paymentId;

    if (payment) {
      user = await dbService.findUserById(payment.user_id);
      amount = payment.amount;
      targetRef = payment.transaction_ref;
    } else if (link) {
      user = await dbService.findUserById(link.user_id);
      amount = link.amount;
      targetRef = link.id;
    }

    if (!user || !user.google_app_password || user.google_app_password.trim().length < 8) {
      const allUsers = await dbService.getAllUsers();
      const activeUser = allUsers.find(
        (u) => Boolean(u.google_app_password && u.google_app_password.replace(/\s+/g, '').length >= 8)
      );
      if (activeUser) {
        user = activeUser;
      }
    }

    const emailToUse = user?.fampay_gmail || user?.email;

    // If user has not configured IMAP App Password, return pending
    if (!user || !emailToUse || !user.google_app_password || user.google_app_password.trim().length < 8) {
      return { status: 'PENDING' };
    }

    // Reuse in-flight scan to avoid spamming concurrent IMAP sockets
    const inFlightKey = `${paymentId}_${amount}`;
    if (PaymentService.inFlightScans.has(inFlightKey)) {
      return PaymentService.inFlightScans.get(inFlightKey)!;
    }

    // Determine strictly scoped session cutoff timestamp so older emails from previous transactions are never matched!
    let minTimestamp = link
      ? new Date(link.created_at).getTime() - 180000
      : (payment ? new Date(payment.created_at).getTime() - 180000 : Date.now() - 15 * 60 * 1000);

    if (since && since < minTimestamp) {
      minTimestamp = since;
    }

    const allPayments = await dbService.getAllPayments();
    const usedUtrs = allPayments.map((p) => p.transaction_ref).filter(Boolean);

    const scanPromise = (async () => {
      try {
        const imapResult = await ImapService.verifyLiveEmailAlert(
          emailToUse,
          user.google_app_password,
          amount,
          targetRef,
          undefined,
          user.imap_host,
          user.imap_port,
          minTimestamp,
          usedUtrs
        );

        if (imapResult.success && imapResult.utr) {
          let confirmedPayment: UpiPaymentRecord | null = null;
          if (payment) {
            payment.transaction_ref = imapResult.utr;
            confirmedPayment = await dbService.confirmPayment(payment.id);
          } else if (link) {
            confirmedPayment = await dbService.createPaymentRecord({
              transaction_ref: imapResult.utr,
              user_id: user.id,
              user_email: user.email,
              upi_id: user.fampay_upi_id || 'merchant@fam',
              amount: link.amount,
              note: link.title,
              qr_data_url: '',
              status: 'CONFIRMED',
              confirmed_at: new Date().toISOString(),
            });
            await dbService.addWalletBalance(user.id, link.amount);
            await dbService.updatePaymentLinkStatus(link.id, 'CAPTURED');
          }

          if (confirmedPayment) {
            // Auto-activate subscription if payment is for a subscription plan
            if (confirmedPayment.note && (confirmedPayment.note.includes('Sub:') || confirmedPayment.note.toLowerCase().includes('subscription') || confirmedPayment.note.toLowerCase().includes('plan'))) {
              const planId = confirmedPayment.note.replace('Sub:', '').trim();
              const plans = dbService.getSubscriptionPlans();
              const matchedPlan = plans.find(p => p.id === planId || p.name.toLowerCase() === planId.toLowerCase()) || plans[0];
              const days = matchedPlan ? matchedPlan.duration_days : 30;

              await dbService.updateUserSubscription(confirmedPayment.user_id, matchedPlan ? matchedPlan.id : 'Pro Plan', days);
              console.log(`[Subscription Engine]: Auto-activated subscription for user ${confirmedPayment.user_id} (+${days} days)!`);
            }

            PaymentService.triggerWebhook(confirmedPayment).catch(() => {});

            // Dispatch automated Payment Confirmation Receipt email to customer and merchant
            const targetRecipient = customerEmail || (link as any)?.customer_email || confirmedPayment.user_email || user.email;
            if (targetRecipient) {
              EmailService.sendPaymentReceiptEmail({
                toEmail: targetRecipient,
                amount: confirmedPayment.amount,
                upiId: confirmedPayment.upi_id || user.fampay_upi_id || 'merchant@fam',
                transactionRef: confirmedPayment.id,
                utr: imapResult.utr,
                note: confirmedPayment.note,
                merchantName: user.name || 'FamGateway Merchant',
              }).catch((e) => console.error('[Receipt Email Error]:', e));
            }

            if (user.email && user.email !== targetRecipient) {
              EmailService.sendPaymentReceiptEmail({
                toEmail: user.email,
                amount: confirmedPayment.amount,
                upiId: confirmedPayment.upi_id || user.fampay_upi_id || 'merchant@fam',
                transactionRef: confirmedPayment.id,
                utr: imapResult.utr,
                note: `[Merchant Alert] ${confirmedPayment.note || 'Payment Received'}`,
                merchantName: user.name || 'FamGateway Merchant',
              }).catch(() => {});
            }
          }

          await dbService.addLog({
            user_id: user.id,
            user_email: user.email,
            action: 'AUTO_DETECT_IMAP_SUCCESS',
            details: `Payment auto-detected & confirmed: ₹${amount} with UTR: ${imapResult.utr}`,
            status: 'SUCCESS',
            ip: '127.0.0.1',
          });

          return {
            status: 'CONFIRMED' as const,
            message: `Payment Automatically Detected & Confirmed! Bank UTR: ${imapResult.utr}`,
            payment: confirmedPayment,
          };
        }

        return { status: 'PENDING' as const };
      } catch {
        return { status: 'PENDING' as const };
      } finally {
        PaymentService.inFlightScans.delete(inFlightKey);
      }
    })();

    PaymentService.inFlightScans.set(inFlightKey, scanPromise);
    return scanPromise;
  }

  /**
   * Triggers merchant webhook with HMAC-SHA256 signature
   */
  public static async triggerWebhook(payment: UpiPaymentRecord) {
    const user = await dbService.findUserById(payment.user_id);
    if (!user || !user.webhook_url) return;

    const payload = {
      event: 'payment.captured',
      data: {
        id: payment.id,
        transaction_ref: payment.transaction_ref,
        amount: payment.amount,
        upi_id: payment.upi_id,
        note: payment.note,
        status: payment.status,
        confirmed_at: payment.confirmed_at,
        created_at: payment.created_at,
      },
    };

    const body = JSON.stringify(payload);
    const secret = user.webhook_secret || user.api_key || 'fgw_secret';
    const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');

    try {
      const res = await fetch(user.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-FamGateway-Signature': signature,
          'User-Agent': 'FamGateway-Webhook-Engine/1.0',
        },
        body,
      });

      await dbService.addLog({
        user_id: user.id,
        user_email: user.email,
        action: 'WEBHOOK_DELIVERED',
        ip: '127.0.0.1',
        status: res.ok ? 'SUCCESS' : 'FAILED',
        details: `Webhook sent to ${user.webhook_url}. Status: ${res.status} ${res.statusText}`,
      });
    } catch (e) {
      await dbService.addLog({
        user_id: user.id,
        user_email: user.email,
        action: 'WEBHOOK_DELIVERY_FAILED',
        ip: '127.0.0.1',
        status: 'FAILED',
        details: `Error delivering webhook to ${user.webhook_url}: ${(e as Error).message}`,
      });
    }
  }
}
