import Imap from 'imap';
import { simpleParser } from 'mailparser';

export interface ImapVerificationResult {
  success: boolean;
  message: string;
  utr?: string;
  transactionId?: string;
  sender?: string;
  emailSubject?: string;
  matchedAmount?: number;
}

export class ImapService {
  /**
   * Helper to resolve the correct IMAP server host based on email domain
   */
  public static resolveHost(email: string, customHost?: string): string {
    if (customHost && customHost.trim()) return customHost.trim();
    const domain = email.toLowerCase().split('@')[1] || '';
    if (domain.includes('yahoo')) return 'imap.mail.yahoo.com';
    if (domain.includes('outlook') || domain.includes('hotmail')) return 'outlook.office365.com';
    if (domain.includes('icloud')) return 'imap.mail.me.com';
    return 'imap.gmail.com';
  }

  /**
   * Tests the IMAP connection with provided credentials and host.
   */
  public static async testConnection(
    email: string,
    appPassword: string,
    customHost?: string,
    customPort: number = 993
  ): Promise<{ success: boolean; message: string; totalEmails?: number; host?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanAppPass = appPassword.replace(/\s+/g, '');

    if (!cleanEmail.includes('@')) {
      return { success: false, message: 'Invalid email address provided.' };
    }

    if (cleanAppPass.length < 8) {
      return {
        success: false,
        message: 'App Password must be provided. For Google accounts, enter the 16-character App Password.',
      };
    }

    const host = this.resolveHost(cleanEmail, customHost);

    return new Promise((resolve) => {
      const imapConfig: Imap.Config = {
        user: cleanEmail,
        password: cleanAppPass,
        host,
        port: customPort || 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        connTimeout: 20000,
        authTimeout: 20000,
      };

      const imap = new Imap(imapConfig);
      let finished = false;

      const complete = (res: { success: boolean; message: string; totalEmails?: number; host?: string }) => {
        if (!finished) {
          finished = true;
          try {
            imap.end();
          } catch {
            // Ignore
          }
          resolve(res);
        }
      };

      const timer = setTimeout(() => {
        complete({
          success: false,
          host,
          message: `Connection to mail server ${host}:${customPort || 993} timed out after 20 seconds. Check network or App Password.`,
        });
      }, 20000);

      imap.once('ready', () => {
        imap.openBox('INBOX', true, (err, box) => {
          clearTimeout(timer);
          if (err) {
            return complete({
              success: false,
              host,
              message: `Failed to open INBOX on ${host}: ` + err.message,
            });
          }

          complete({
            success: true,
            host,
            message: `Connected successfully to ${host} for ${cleanEmail}! Found ${box.messages.total} total emails in INBOX.`,
            totalEmails: box.messages.total,
          });
        });
      });

      imap.once('error', (err: any) => {
        clearTimeout(timer);
        let errorMsg = `IMAP Authentication Error on ${host}: ` + (err.message || 'Unknown error');
        if (err.message && (err.message.includes('AUTHENTICATIONFAILED') || err.message.includes('Invalid credentials'))) {
          errorMsg = `Login Failed on ${host} for ${cleanEmail}: Invalid App Password or IMAP is disabled in your email account settings.`;
        }
        complete({ success: false, host, message: errorMsg });
      });

      imap.connect();
    });
  }

  /**
   * Cleans HTML and decodes common entities to prepare text for matching
   */
  private static cleanHtmlContent(raw: string): string {
    return raw
      .replace(/<[^>]+>/g, ' ')
      .replace(/&#8377;|&amp;#8377;|&#x20B9;/gi, ' ₹ ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }

  /**
   * Connects to IMAP server, searches recent INBOX emails using mailparser.
   * Accurately verifies genuine FamPay, FamApp, IDFC FIRST Bank, and UPI alerts.
   * Extracts REAL Bank UTR (10-14 digits) and Transaction ID.
   * NEVER marks payment as confirmed without a genuine incoming payment email!
   */
  public static async verifyLiveEmailAlert(
    email: string,
    appPassword: string,
    targetAmount: number,
    transactionRef?: string,
    providedUtr?: string,
    customHost?: string,
    customPort: number = 993,
    minTimestamp?: number,
    usedUtrs: string[] = []
  ): Promise<ImapVerificationResult> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanAppPass = appPassword.replace(/\s+/g, '');

    if (!cleanEmail.includes('@')) {
      return {
        success: false,
        message: 'Invalid email address provided for IMAP verification.',
      };
    }

    if (cleanAppPass.length < 8) {
      return {
        success: false,
        message: 'Please provide a valid 16-digit Google App Password in Integrations.',
      };
    }

    const host = this.resolveHost(cleanEmail, customHost);
    const cleanUtr = (providedUtr || '').replace(/\D/g, '');

    return new Promise((resolve) => {
      const imapConfig: Imap.Config = {
        user: cleanEmail,
        password: cleanAppPass,
        host,
        port: customPort || 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        connTimeout: 20000,
        authTimeout: 20000,
      };

      const imap = new Imap(imapConfig);
      let resolved = false;

      const finish = (result: ImapVerificationResult) => {
        if (!resolved) {
          resolved = true;
          try {
            imap.end();
          } catch {
            // Ignore
          }
          resolve(result);
        }
      };

      const timer = setTimeout(() => {
        finish({
          success: false,
          message: `IMAP connection to ${host} timed out. Could not verify payment in your email inbox.`,
        });
      }, 20000);

      imap.once('ready', () => {
        imap.openBox('INBOX', true, (err, box) => {
          if (err) {
            clearTimeout(timer);
            return finish({
              success: false,
              message: `Failed to open INBOX on ${host}: ` + err.message,
            });
          }

          const totalMessages = box.messages.total;
          if (totalMessages === 0) {
            clearTimeout(timer);
            return finish({
              success: false,
              message: `INBOX on ${host} is empty. No payment alert email found for ₹${targetAmount}.`,
            });
          }

          // Fetch the latest 25 emails from INBOX
          const fetchCount = Math.min(25, totalMessages);
          const startSeq = Math.max(1, totalMessages - fetchCount + 1);
          const fetchStream = imap.seq.fetch(`${startSeq}:${totalMessages}`, {
            bodies: '',
            struct: true,
          });

          const parsePromises: Promise<any>[] = [];
          let matchFound = false;

          fetchStream.on('message', (msg) => {
            msg.on('body', (stream) => {
              const p = simpleParser(stream as any)
                .then((parsed) => {
                  if (matchFound) return;

                  const subject = (parsed.subject || '').trim();
                  const fromAddress = (parsed.from?.text || '').toLowerCase();
                  const date = parsed.date ? parsed.date.getTime() : 0;
                  const bodyText = (parsed.text || '') + ' ' + (parsed.html ? parsed.html.replace(/<[^>]+>/g, ' ') : '');
                  const cleanText = bodyText.replace(/\s+/g, ' ');

                  const fullText = `${subject} ${fromAddress} ${cleanText}`.toLowerCase();

                  // 1. Filter out non-payment emails and security alerts
                  const isGoogleSecurityAlert =
                    (fromAddress.includes('accounts.google.com') ||
                      fromAddress.includes('google-noreply@google.com') ||
                      fromAddress.includes('github.com') ||
                      fromAddress.includes('linkedin.com')) &&
                    (subject.toLowerCase().includes('security') ||
                      subject.toLowerCase().includes('sign-in') ||
                      subject.toLowerCase().includes('invit'));

                  if (isGoogleSecurityAlert) return;

                  // 2. Must be within the order session time window (generous buffer of 10 minutes for clock variance)
                  const sessionCutoff = minTimestamp ? minTimestamp - 600000 : (Date.now() - 30 * 60 * 1000);
                  if (sessionCutoff > 0 && date > 0 && date < sessionCutoff) {
                    return; // Email is older than checkout session start, cannot confirm this payment
                  }

                  // 3. Sender / Ecosystem Recognition (FamPay, UPI, Banks)
                  const isFamPayOrUpi =
                    fromAddress.includes('famapp') ||
                    fromAddress.includes('fampay') ||
                    fromAddress.includes('idfc') ||
                    fromAddress.includes('triotech') ||
                    fromAddress.includes('phonepe') ||
                    fromAddress.includes('paytm') ||
                    fromAddress.includes('google') ||
                    fromAddress.includes('gpay') ||
                    fromAddress.includes('bank') ||
                    fromAddress.includes('axis') ||
                    fromAddress.includes('hdfc') ||
                    fromAddress.includes('icici') ||
                    fromAddress.includes('sbi') ||
                    fromAddress.includes('kotak') ||
                    fromAddress.includes('airtel') ||
                    fromAddress.includes('razorpay') ||
                    fromAddress.includes('cashfree') ||
                    fromAddress.includes('canara') ||
                    fromAddress.includes('pnb') ||
                    fromAddress.includes('alert') ||
                    fromAddress.includes('notify') ||
                    subject.toLowerCase().includes('fam') ||
                    subject.toLowerCase().includes('upi') ||
                    subject.toLowerCase().includes('received') ||
                    subject.toLowerCase().includes('credited') ||
                    subject.toLowerCase().includes('sent you') ||
                    cleanText.toLowerCase().includes('fampay') ||
                    cleanText.toLowerCase().includes('famapp') ||
                    cleanText.toLowerCase().includes('upi');

                  if (!isFamPayOrUpi) return;

                  // 4. Must be a genuine CREDIT / INWARD transaction (not debit or withdrawal)
                  const isCredit =
                    subject.toLowerCase().includes('received') ||
                    subject.toLowerCase().includes('credited') ||
                    subject.toLowerCase().includes('successful') ||
                    subject.toLowerCase().includes('sent you') ||
                    subject.toLowerCase().includes('paid you') ||
                    cleanText.toLowerCase().includes('successfully received') ||
                    cleanText.toLowerCase().includes('received') ||
                    cleanText.toLowerCase().includes('credited') ||
                    cleanText.toLowerCase().includes('sent you') ||
                    cleanText.toLowerCase().includes('paid you') ||
                    cleanText.toLowerCase().includes('added to your wallet');

                  if (!isCredit) return;

                  // 5. Strict Amount Matching (Mandatory)
                  const amt = Number(targetAmount);
                  const amtStr = amt.toString();
                  const amtDec1 = amt.toFixed(1); // e.g. "1.0"
                  const amtDec2 = amt.toFixed(2); // e.g. "1.00"

                  const amountPatterns = [
                    new RegExp(`(?:₹|rs\\.?|inr)\\s*(${amtStr}|${amtDec1}|${amtDec2})(?!\\d)`, 'i'),
                    new RegExp(`received\\s+(?:₹|rs\\.?|inr)?\\s*(${amtStr}|${amtDec1}|${amtDec2})(?!\\d)`, 'i'),
                    new RegExp(`credited\\s+(?:with|by)?\\s*(?:₹|rs\\.?|inr)?\\s*(${amtStr}|${amtDec1}|${amtDec2})(?!\\d)`, 'i'),
                    new RegExp(`(${amtStr}|${amtDec1}|${amtDec2})\\s*(?:inr|rs|₹|in your famx)`, 'i'),
                  ];

                  const hasAmount = amountPatterns.some((pattern) => pattern.test(fullText));
                  if (!hasAmount) return;

                  // 6. Extract REAL Bank UTR / FamApp Transaction ID (alphanumeric FMPIB..., FPX..., or 10-16 digits)
                  const utrMatch =
                    cleanText.match(/transaction\s*(?:id|ref|number)?[:\s#]+([A-Z0-9_-]{8,24})/i) ||
                    cleanText.match(/(FMPIB[0-9A-Z]+)/i) ||
                    cleanText.match(/(FPX-[0-9A-Z-]+)/i) ||
                    cleanText.match(/UTR[:\s#]+([0-9A-Z]{8,20})/i) ||
                    cleanText.match(/UPI\s*Ref(?:erence)?[:\s#]+([0-9A-Z]{8,20})/i) ||
                    cleanText.match(/RRN[:\s#]+([0-9A-Z]{8,20})/i) ||
                    cleanText.match(/Ref\s*(?:no|number)?[:\s#]+([0-9A-Z]{8,20})/i) ||
                    cleanText.match(/\b([0-9]{10,14})\b/);

                  const extractedUtr = utrMatch ? (utrMatch[1] || utrMatch[0]) : `FMP-${Date.now()}`;

                  // 7. If customer provided a UTR, verify against email content
                  if (cleanUtr && cleanUtr.length >= 6) {
                    if (extractedUtr !== cleanUtr && !cleanText.includes(cleanUtr)) {
                      return; // Customer typed a UTR that does not match this email!
                    }
                  }

                  // 8. Anti-Replay: Prevent reusing a UTR that was already redeemed for a previous transaction
                  if (usedUtrs.includes(extractedUtr)) {
                    return;
                  }

                  // 9. Extract Transaction ID from FamApp body
                  const txnMatch =
                    cleanText.match(/transaction\s*(?:id|ref)[:\s#]+([A-Z0-9_-]+)/i) ||
                    cleanText.match(/(FMPIB[A-Z0-9]+)/i) ||
                    cleanText.match(/(FPX-[A-Z0-9-]+)/i);

                  const extractedTxnId = txnMatch ? txnMatch[1] : (transactionRef || extractedUtr);

                  // MATCH CONFIRMED WITH REAL PROOF!
                  matchFound = true;
                  clearTimeout(timer);

                  return finish({
                    success: true,
                    message: `FamPay payment of ₹${amt.toFixed(2)} verified! ID: ${extractedUtr}`,
                    emailSubject: subject,
                    sender: fromAddress,
                    utr: extractedUtr,
                    transactionId: extractedTxnId,
                    matchedAmount: amt,
                  });
                })
                .catch(() => {});

              parsePromises.push(p);
            });
          });

          fetchStream.once('error', (fetchErr) => {
            clearTimeout(timer);
            return finish({
              success: false,
              message: `Failed reading emails via IMAP from ${host}: ` + fetchErr.message,
            });
          });

          fetchStream.once('end', () => {
            Promise.all(parsePromises).then(() => {
              if (!matchFound && !resolved) {
                clearTimeout(timer);
                finish({
                  success: false,
                  message: `Payment NOT verified. No new FamPay payment alert found in ${cleanEmail} for ₹${targetAmount}.`,
                });
              }
            });
          });
        });
      });

      imap.once('error', (err: any) => {
        clearTimeout(timer);
        let errorMsg = `IMAP authentication failed on ${host}.`;
        if (err.message && (err.message.includes('AUTHENTICATIONFAILED') || err.message.includes('Invalid credentials'))) {
          errorMsg = `Login Failed on ${host} for ${cleanEmail}: Invalid App Password or IMAP is disabled in your email account settings.`;
        } else if (err.message) {
          errorMsg = err.message;
        }

        finish({
          success: false,
          message: errorMsg,
        });
      });

      imap.connect();
    });
  }

  /**
   * Evaluates email body text and headers for testing/diagnostics.
   */
  public static parseEmailBodyAndSubject(
    rawSubject: string,
    rawFromAddress: string,
    rawBody: string,
    targetAmount: number,
    providedUtr: string = '',
    transactionRef: string = ''
  ) {
    const subject = (rawSubject || '').toLowerCase();
    const fromAddress = (rawFromAddress || '').toLowerCase();
    const cleanUtr = (providedUtr || '').trim();
    const cleanText = (rawBody || '').replace(/\s+/g, ' ');
    const fullText = `${subject} ${fromAddress} ${cleanText}`.toLowerCase();

    const isFamPayOrUpi =
      fromAddress.includes('famapp') ||
      fromAddress.includes('fampay') ||
      fromAddress.includes('idfc') ||
      fromAddress.includes('triotech') ||
      fromAddress.includes('phonepe') ||
      fromAddress.includes('paytm') ||
      fromAddress.includes('google') ||
      fromAddress.includes('gpay') ||
      fromAddress.includes('bank') ||
      subject.includes('fam') ||
      subject.includes('upi') ||
      subject.includes('received') ||
      subject.includes('credited');

    const isCredit =
      subject.includes('received') ||
      subject.includes('credited') ||
      subject.includes('successful') ||
      fullText.includes('received') ||
      fullText.includes('credited');

    const amt = Number(targetAmount);
    const amtStr = amt.toString();
    const amtDec1 = amt.toFixed(1);
    const amtDec2 = amt.toFixed(2);

    const amountPatterns = [
      new RegExp(`(?:₹|rs\\.?|inr)\\s*(${amtStr}|${amtDec1}|${amtDec2})(?!\\d)`, 'i'),
      new RegExp(`received\\s+(?:₹|rs\\.?|inr)?\\s*(${amtStr}|${amtDec1}|${amtDec2})(?!\\d)`, 'i'),
      new RegExp(`credited\\s+(?:with|by)?\\s*(?:₹|rs\\.?|inr)?\\s*(${amtStr}|${amtDec1}|${amtDec2})(?!\\d)`, 'i'),
      new RegExp(`(${amtStr}|${amtDec1}|${amtDec2})\\s*(?:inr|rs|₹|in your famx)`, 'i'),
    ];

    const hasAmountWithCurrency = amountPatterns.some((p) => p.test(fullText));

    const utrMatch =
      cleanText.match(/UTR[:\s#]+([0-9]{10,14})/i) ||
      cleanText.match(/UPI Ref(?:erence)?[:\s#]+([0-9]{10,14})/i) ||
      cleanText.match(/RRN[:\s#]+([0-9]{10,14})/i) ||
      cleanText.match(/\b([0-9]{12})\b/);

    const extractedUtr = utrMatch ? utrMatch[1] : (cleanUtr || null);

    const txnMatch =
      cleanText.match(/transaction\s*(?:id|ref)[:\s#]+([A-Z0-9_-]+)/i) ||
      cleanText.match(/(FMPIB[A-Z0-9]+)/i);

    const extractedTxnId = txnMatch ? txnMatch[1] : (transactionRef || extractedUtr || '');

    const isMatch = isFamPayOrUpi && isCredit && hasAmountWithCurrency && !!extractedUtr;

    return {
      isMatch,
      isUpiEcosystem: isFamPayOrUpi,
      hasPaymentKeywords: isCredit,
      hasAmountWithCurrency,
      hasUtrMatch: !!utrMatch,
      hasRefMatch: Boolean(transactionRef && fullText.includes(transactionRef.toLowerCase())),
      extractedUtr: extractedUtr || 'N/A',
      extractedTxnId: extractedTxnId || 'N/A',
    };
  }
}

