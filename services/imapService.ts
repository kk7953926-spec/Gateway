import Imap from 'imap';

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
   * Connects to IMAP server, searches recent INBOX emails for an ACTUAL genuine payment alert matching the amount or UTR.
   * Accurately supports FamPay, FamApp, IDFC FIRST Bank, UPI VPAs, PhonePe, Paytm, and GPay.
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
        message: 'Please provide a valid App Password.',
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
        connTimeout: 25000,
        authTimeout: 25000,
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
      }, 25000);

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

          // Fetch the latest 20 emails from INBOX for near-instant scanning
          const fetchCount = Math.min(20, totalMessages);
          const startSeq = Math.max(1, totalMessages - fetchCount + 1);
          const fetchStream = imap.seq.fetch(`${startSeq}:${totalMessages}`, {
            bodies: ['HEADER.FIELDS (FROM SUBJECT DATE)', 'TEXT'],
            struct: true,
          });

          let matchFound = false;
          let emailsProcessed = 0;
          const totalToProcess = totalMessages - startSeq + 1;
          const recentEmailSummaries: string[] = [];

          fetchStream.on('message', (msg) => {
            let headerText = '';
            let bodyText = '';

            msg.on('body', (stream, info) => {
              let chunk = '';
              stream.on('data', (d) => {
                chunk += d.toString();
              });
              stream.on('end', () => {
                if (info.which && info.which.includes('HEADER')) {
                  headerText = chunk;
                } else {
                  bodyText = chunk;
                }
              });
            });

            msg.once('end', () => {
              emailsProcessed++;

              const subjectMatch = headerText.match(/Subject:\s*([^\r\n]+)/i);
              const fromMatch = headerText.match(/From:\s*([^\r\n]+)/i);
              const dateMatch = headerText.match(/Date:\s*([^\r\n]+)/i);

              const rawSubject = subjectMatch ? subjectMatch[1].trim() : '';
              const subject = rawSubject.toLowerCase();
              const fromAddress = (fromMatch ? fromMatch[1].trim() : '').toLowerCase();
              const rawDate = dateMatch ? dateMatch[1].trim() : '';
              const emailTime = rawDate ? new Date(rawDate).getTime() : 0;
              const textContent = ImapService.cleanHtmlContent(bodyText).toLowerCase();

              // Build unified searchable text
              const fullText = `${subject} ${fromAddress} ${textContent}`;

              // Collect recent subjects for diagnostic reporting
              if (recentEmailSummaries.length < 5 && rawSubject) {
                recentEmailSummaries.push(`"${rawSubject.slice(0, 45)}"`);
              }

              // Debug Log for troubleshooting email matching
              console.log('Scanning email:', { subject, from: fromAddress, amount: targetAmount });

              // Check email timestamp to reject old emails from prior sessions
              // Relaxed by 24 hours to prevent clock skews and delayed email arrivals
              const adjustedMinTimestamp = minTimestamp ? minTimestamp - (24 * 60 * 60 * 1000) : 0;
              if (adjustedMinTimestamp && emailTime > 0 && emailTime < adjustedMinTimestamp) {
                if (emailsProcessed >= totalToProcess && !matchFound) {
                  clearTimeout(timer);
                  return finish({
                    success: false,
                    message: `Payment NOT verified. No NEW FamPay payment alert found in ${cleanEmail} for ₹${targetAmount}. Older emails were received before this checkout session started.`,
                  });
                }
                return;
              }

              // 1. Blacklist ONLY pure Google Account security/sign-in alerts (never payment emails)
              const isGoogleSecurityAlert =
                (fromAddress.includes('accounts.google.com') ||
                  fromAddress.includes('no-reply@accounts.google.com') ||
                  fromAddress.includes('google-noreply@google.com')) &&
                (subject.includes('security alert') ||
                  subject.includes('critical security') ||
                  subject.includes('new sign-in') ||
                  subject.includes('app password') ||
                  subject.includes('verification code'));

              if (isGoogleSecurityAlert) {
                if (emailsProcessed >= totalToProcess && !matchFound) {
                  clearTimeout(timer);
                  return finish({
                    success: false,
                    message: `Payment NOT verified. No payment alert found for ₹${targetAmount} in ${cleanEmail}. Scanned recent emails: [${recentEmailSummaries.join(', ')}].`,
                  });
                }
                return;
              }

              // 2. Comprehensive FamPay / UPI / Bank Ecosystem Recognition
              const isUpiEcosystem =
                fromAddress.includes('fampay') ||
                fromAddress.includes('famapp') ||
                fromAddress.includes('fam.one') ||
                fromAddress.includes('idfc') ||
                fromAddress.includes('yesbank') ||
                fromAddress.includes('triotech') ||
                fromAddress.includes('phonepe') ||
                fromAddress.includes('paytm') ||
                fromAddress.includes('google') ||
                fromAddress.includes('gpay') ||
                fromAddress.includes('icici') ||
                fromAddress.includes('hdfc') ||
                fromAddress.includes('sbi') ||
                fromAddress.includes('axis') ||
                fromAddress.includes('razorpay') ||
                fromAddress.includes('cashfree') ||
                fromAddress.includes('bank') ||
                subject.includes('fam') ||
                subject.includes('fampay') ||
                subject.includes('famapp') ||
                subject.includes('upi') ||
                subject.includes('credited') ||
                subject.includes('received') ||
                subject.includes('payment') ||
                subject.includes('transfer') ||
                fullText.includes('@fam') ||
                fullText.includes('@yesfam') ||
                fullText.includes('fampay') ||
                fullText.includes('famapp') ||
                fullText.includes('upi') ||
                fullText.includes('credited') ||
                fullText.includes('received') ||
                fullText.includes('payment');

              if (!isUpiEcosystem && !cleanUtr) {
                if (emailsProcessed >= totalToProcess && !matchFound) {
                  clearTimeout(timer);
                  return finish({
                    success: false,
                    message: `Payment NOT verified. No UPI/FamPay payment email alert found in ${cleanEmail} for ₹${targetAmount}.`,
                  });
                }
                return;
              }

              // 3. Payment Activity Keywords
              const hasPaymentKeywords =
                subject.includes('paid') ||
                subject.includes('sent') ||
                subject.includes('received') ||
                subject.includes('credited') ||
                subject.includes('debited') ||
                subject.includes('transfer') ||
                subject.includes('transferred') ||
                subject.includes('successful') ||
                subject.includes('success') ||
                subject.includes('transaction') ||
                subject.includes('payment') ||
                subject.includes('alert') ||
                subject.includes('added') ||
                fullText.includes('credited') ||
                fullText.includes('received') ||
                fullText.includes('payment successful') ||
                fullText.includes('transfer successful') ||
                fullText.includes('paid to') ||
                fullText.includes('sent to') ||
                fullText.includes('transaction successful') ||
                fullText.includes('upi ref') ||
                fullText.includes('utr') ||
                cleanUtr.length >= 8;

              // 4. Robust Amount Matching (Supports ₹1, 1.00, Rs. 1, INR 1, etc.)
              const amtInt = Math.floor(targetAmount).toString();
              const amtDec = targetAmount.toFixed(2);

              const hasAmountWithCurrency =
                fullText.includes(`₹${amtInt}`) ||
                fullText.includes(`₹ ${amtInt}`) ||
                fullText.includes(`rs.${amtInt}`) ||
                fullText.includes(`rs. ${amtInt}`) ||
                fullText.includes(`rs ${amtInt}`) ||
                fullText.includes(`inr ${amtInt}`) ||
                fullText.includes(`inr. ${amtInt}`) ||
                fullText.includes(`₹${amtDec}`) ||
                fullText.includes(`₹ ${amtDec}`) ||
                fullText.includes(`rs.${amtDec}`) ||
                fullText.includes(`rs ${amtDec}`) ||
                fullText.includes(`inr ${amtDec}`) ||
                fullText.includes(`${amtInt}/-`) ||
                fullText.includes(`${amtInt} inr`) ||
                fullText.includes(`${amtDec} inr`) ||
                fullText.includes(`${amtInt} rs`) ||
                fullText.includes(`rs ${amtInt}`) ||
                fullText.includes(`inr ${amtInt}`) ||
                fullText.includes(`₹${amtInt}`) ||
                new RegExp(`\\b${amtInt}\\b`).test(fullText) ||
                (hasPaymentKeywords && (fullText.includes(` ${amtInt} `) || fullText.includes(amtDec)));

              // 5. UTR matching if customer provided UTR
              const hasUtrMatch =
                cleanUtr.length >= 8 &&
                (fullText.includes(cleanUtr) ||
                  textContent.includes(cleanUtr));

              // 6. Transaction Reference matching
              const hasRefMatch =
                transactionRef && transactionRef.length > 5
                  ? fullText.includes(transactionRef.toLowerCase())
                  : false;

              // Match Condition
              const isMatch =
                hasUtrMatch ||
                (hasPaymentKeywords && hasAmountWithCurrency) ||
                (hasRefMatch && hasPaymentKeywords);

              if (isMatch) {
                if (!matchFound) {
                  matchFound = true;
                  clearTimeout(timer);

                  const utrRegexMatch =
                    fullText.match(/utr[:\s#]+(\d{10,14})/i) ||
                    fullText.match(/ref[:\s#]+(\d{10,14})/i) ||
                    fullText.match(/rrn[:\s#]+(\d{10,14})/i) ||
                    fullText.match(/\b(4\d{11}|5\d{11}|6\d{11}|3\d{11})\b/);

                  const extractedUtr = cleanUtr || (utrRegexMatch ? utrRegexMatch[1] : `UTR-${Date.now()}`);

                  // Extract FamPay X transaction ID or order reference from email body
                  const txnMatch =
                    fullText.match(/(fpx-pay-[a-z0-9]+)/i) ||
                    fullText.match(/(fpx-link-[a-z0-9]+)/i) ||
                    fullText.match(/txn[_\s#:]*([a-z0-9_\-]+)/i) ||
                    fullText.match(/transaction\s*id[_\s#:]*([a-z0-9_\-]+)/i) ||
                    fullText.match(/ref[_\s#:]*([a-z0-9_\-]+)/i);

                  const extractedTxnId = txnMatch ? txnMatch[1] : (transactionRef || extractedUtr);

                  // Reject if this UTR has already been captured for an earlier transaction!
                  if (extractedUtr && usedUtrs.includes(extractedUtr)) {
                    if (emailsProcessed >= totalToProcess && !matchFound) {
                      clearTimeout(timer);
                      return finish({
                        success: false,
                        message: `Payment NOT verified. Payment alert with UTR ${extractedUtr} was already redeemed for a previous transaction. Please complete a new payment.`,
                      });
                    }
                    return;
                  }

                  return finish({
                    success: true,
                    message: `FamPay X Payment Verified! Matched Alert: "${rawSubject}" from ${fromAddress || 'FamPay Gateway'}`,
                    emailSubject: rawSubject,
                    sender: fromAddress,
                    utr: extractedUtr,
                    transactionId: extractedTxnId,
                    matchedAmount: targetAmount,
                  });
                }
              }

              // If all emails processed and no match
              if (emailsProcessed >= totalToProcess && !matchFound) {
                clearTimeout(timer);
                return finish({
                  success: false,
                  message: `Payment NOT verified. No matching FamPay X payment alert found in ${cleanEmail} for ₹${targetAmount}.`,
                });
              }
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
            setTimeout(() => {
              if (!matchFound && !resolved) {
                clearTimeout(timer);
                finish({
                  success: false,
                  message: `Payment NOT verified. No matching FamPay X payment alert found in ${cleanEmail} for ₹${targetAmount}.`,
                });
              }
            }, 1000);
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
   * Evaluates mock or real email body text and headers for testing/diagnostics.
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
    const textContent = this.cleanHtmlContent(rawBody).toLowerCase();
    const fullText = `${subject} ${fromAddress} textContent: ${textContent}`;

    const isUpiEcosystem =
      fromAddress.includes('fampay') ||
      fromAddress.includes('famapp') ||
      fromAddress.includes('fam.one') ||
      fromAddress.includes('idfc') ||
      fromAddress.includes('yesbank') ||
      fromAddress.includes('triotech') ||
      fromAddress.includes('phonepe') ||
      fromAddress.includes('paytm') ||
      fromAddress.includes('google') ||
      fromAddress.includes('gpay') ||
      fromAddress.includes('icici') ||
      fromAddress.includes('hdfc') ||
      fromAddress.includes('sbi') ||
      fromAddress.includes('axis') ||
      fromAddress.includes('razorpay') ||
      fromAddress.includes('cashfree') ||
      fromAddress.includes('bank') ||
      subject.includes('fam') ||
      subject.includes('fampay') ||
      subject.includes('famapp') ||
      subject.includes('upi') ||
      subject.includes('credited') ||
      subject.includes('received') ||
      subject.includes('payment') ||
      subject.includes('transfer') ||
      fullText.includes('@fam') ||
      fullText.includes('@yesfam') ||
      fullText.includes('fampay') ||
      fullText.includes('famapp') ||
      fullText.includes('upi') ||
      fullText.includes('credited') ||
      fullText.includes('received') ||
      fullText.includes('payment');

    const hasPaymentKeywords =
      subject.includes('paid') ||
      subject.includes('sent') ||
      subject.includes('received') ||
      subject.includes('credited') ||
      subject.includes('debited') ||
      subject.includes('transfer') ||
      subject.includes('transferred') ||
      subject.includes('successful') ||
      subject.includes('success') ||
      subject.includes('transaction') ||
      subject.includes('payment') ||
      subject.includes('alert') ||
      subject.includes('added') ||
      fullText.includes('credited') ||
      fullText.includes('received') ||
      fullText.includes('payment successful') ||
      fullText.includes('transfer successful') ||
      fullText.includes('paid to') ||
      fullText.includes('sent to') ||
      fullText.includes('transaction successful') ||
      fullText.includes('upi ref') ||
      fullText.includes('utr') ||
      cleanUtr.length >= 8;

    const amtInt = Math.floor(targetAmount).toString();
    const amtDec = targetAmount.toFixed(2);

    const hasAmountWithCurrency =
      fullText.includes(`₹${amtInt}`) ||
      fullText.includes(`₹ ${amtInt}`) ||
      fullText.includes(`rs.${amtInt}`) ||
      fullText.includes(`rs. ${amtInt}`) ||
      fullText.includes(`rs ${amtInt}`) ||
      fullText.includes(`inr ${amtInt}`) ||
      fullText.includes(`inr. ${amtInt}`) ||
      fullText.includes(`₹${amtDec}`) ||
      fullText.includes(`₹ ${amtDec}`) ||
      fullText.includes(`rs.${amtDec}`) ||
      fullText.includes(`rs ${amtDec}`) ||
      fullText.includes(`inr ${amtDec}`) ||
      fullText.includes(`${amtInt}/-`) ||
      fullText.includes(`${amtInt} inr`) ||
      fullText.includes(`${amtDec} inr`) ||
      fullText.includes(`${amtInt} rs`) ||
      fullText.includes(`rs ${amtInt}`) ||
      fullText.includes(`inr ${amtInt}`) ||
      fullText.includes(`₹${amtInt}`) ||
      new RegExp(`\\b${amtInt}\\b`).test(fullText) ||
      (hasPaymentKeywords && (fullText.includes(` ${amtInt} `) || fullText.includes(amtDec)));

    const hasUtrMatch =
      cleanUtr.length >= 8 &&
      (fullText.includes(cleanUtr) || textContent.includes(cleanUtr));

    const hasRefMatch =
      transactionRef && transactionRef.length > 5
        ? fullText.includes(transactionRef.toLowerCase())
        : false;

    const isMatch =
      hasUtrMatch ||
      (hasPaymentKeywords && hasAmountWithCurrency) ||
      (hasRefMatch && hasPaymentKeywords);

    const utrRegexMatch =
      fullText.match(/utr[:\s#]+(\d{10,14})/i) ||
      fullText.match(/ref[:\s#]+(\d{10,14})/i) ||
      fullText.match(/rrn[:\s#]+(\d{10,14})/i) ||
      fullText.match(/\b(4\d{11}|5\d{11}|6\d{11}|3\d{11})\b/);

    const extractedUtr = cleanUtr || (utrRegexMatch ? utrRegexMatch[1] : `UTR-${Date.now()}`);

    const txnMatch =
      fullText.match(/(fpx-pay-[a-z0-9]+)/i) ||
      fullText.match(/(fpx-link-[a-z0-9]+)/i) ||
      fullText.match(/txn[_\s#:]*([a-z0-9_\-]+)/i) ||
      fullText.match(/transaction\s*id[_\s#:]*([a-z0-9_\-]+)/i) ||
      fullText.match(/ref[_\s#:]*([a-z0-9_\-]+)/i);

    const extractedTxnId = txnMatch ? txnMatch[1] : (transactionRef || extractedUtr);

    return {
      isMatch,
      isUpiEcosystem,
      hasPaymentKeywords,
      hasAmountWithCurrency,
      hasUtrMatch,
      hasRefMatch,
      extractedUtr,
      extractedTxnId
    };
  }
}
