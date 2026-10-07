import Imap from 'imap';
import { simpleParser } from 'mailparser';

export interface CachedPaymentEmail {
  uid: number;
  date: number;
  amount: number;
  utr: string;
  transactionId: string;
  sender: string;
  subject: string;
  cleanText: string;
}

export interface ImapVerificationResult {
  success: boolean;
  message: string;
  utr?: string;
  transactionId?: string;
  sender?: string;
  emailSubject?: string;
  matchedAmount?: number;
}

export interface ImapDaemonStatus {
  connected: boolean;
  email: string;
  host: string;
  port: number;
  totalInboxMessages: number;
  cachedPaymentsCount: number;
  lastError: string | null;
  lastPingTime: number;
  uptimeSeconds: number;
  lastSyncedAt: string | null;
}

/**
 * High-performance 24/7 background IMAP Daemon.
 * Keeps an open warm socket to Gmail/IMAP server, performs NOOP keepalive,
 * detects new payment emails via both 'mail' events and 5s status polling,
 * and maintains an in-memory hot cache of verified UPI payment emails.
 */
export class ImapDaemon {
  public isConnected: boolean = false;
  public lastPingTime: number = 0;
  public totalInboxMessages: number = 0;
  public lastError: string | null = null;
  public cachedPaymentEmails: CachedPaymentEmail[] = [];
  public startedAt: number = 0;
  public lastSyncedAt: string | null = null;

  private imap: Imap | null = null;
  private currentEmail: string = '';
  private currentPassword: string = '';
  private currentHost: string = 'imap.gmail.com';
  private currentPort: number = 993;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private isReconnecting: boolean = false;
  private paymentListeners: Array<(email: CachedPaymentEmail) => void> = [];

  /**
   * Register listener for newly arrived payment credit emails
   */
  public onPaymentReceived(callback: (email: CachedPaymentEmail) => void): void {
    this.paymentListeners.push(callback);
  }

  /**
   * Starts or updates credentials for the 24/7 IMAP daemon
   */
  public startDaemon(credentials: { email: string; password: string; host?: string; port?: number }): void {
    const cleanEmail = (credentials.email || '').trim().toLowerCase();
    const cleanPass = (credentials.password || '').replace(/\s+/g, '');
    const host = credentials.host?.trim() || ImapService.resolveHost(cleanEmail);
    const port = credentials.port || 993;

    if (!cleanEmail || !cleanPass || cleanPass.length < 8) {
      console.warn('[ImapDaemon 24/7]: Cannot start daemon - invalid email or app password.');
      return;
    }

    const credentialsChanged =
      this.currentEmail !== cleanEmail ||
      this.currentPassword !== cleanPass ||
      this.currentHost !== host ||
      this.currentPort !== port;

    this.currentEmail = cleanEmail;
    this.currentPassword = cleanPass;
    this.currentHost = host;
    this.currentPort = port;

    if (this.startedAt === 0) {
      this.startedAt = Date.now();
    }

    if (credentialsChanged && this.imap) {
      console.log(`[ImapDaemon 24/7]: Credentials updated for ${cleanEmail}. Reconnecting warm daemon...`);
      this.stopDaemon();
    }

    if (!this.isConnected && !this.isReconnecting) {
      this.connect();
    }
  }

  /**
   * Stops the active daemon and clears all timers
   */
  public stopDaemon(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    if (this.imap) {
      try {
        this.imap.removeAllListeners();
        this.imap.on('error', () => {}); // Absorb any trailing close error
        this.imap.end();
      } catch {
        // Ignore
      }
      this.imap = null;
    }

    this.isConnected = false;
    this.isReconnecting = false;
  }

  /**
   * Schedules an automatic reconnect with exponential backoff
   */
  private scheduleReconnect(delayMs: number = 3000): void {
    if (this.reconnectTimer) return;
    this.isReconnecting = true;
    this.isConnected = false;

    console.log(`[ImapDaemon 24/7]: Scheduling automatic reconnect in ${Math.round(delayMs / 1000)}s...`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.isReconnecting = false;
      this.connect();
    }, delayMs);
  }

  /**
   * Connects to IMAP server and opens INBOX with comprehensive error resilience
   */
  private connect(): void {
    if (!this.currentEmail || !this.currentPassword) return;

    if (this.imap) {
      try {
        this.imap.removeAllListeners();
        this.imap.on('error', () => {});
        this.imap.end();
      } catch {
        // Ignore
      }
      this.imap = null;
    }

    console.log(`[ImapDaemon 24/7]: Opening 24/7 warm socket to ${this.currentHost}:${this.currentPort} for ${this.currentEmail}...`);

    const client = new Imap({
      user: this.currentEmail,
      password: this.currentPassword,
      host: this.currentHost,
      port: this.currentPort,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 20000,
      authTimeout: 20000,
      keepalive: {
        interval: 15000,
        idleInterval: 300000,
        forceNoop: true,
      },
    });

    this.imap = client;

    // Use .on('error') so multiple socket errors never trigger uncaught exceptions!
    client.on('error', (err: any) => {
      console.error('[ImapDaemon 24/7 Socket Error]:', err.message);
      this.lastError = err.message;
      this.isConnected = false;
      this.scheduleReconnect(5000);
    });

    client.on('close', (hasErr) => {
      console.warn(`[ImapDaemon 24/7 Socket Closed] hasError=${hasErr}. Auto-reconnecting in 3s...`);
      this.isConnected = false;
      this.scheduleReconnect(3000);
    });

    client.on('end', () => {
      this.isConnected = false;
      this.scheduleReconnect(3000);
    });

    client.once('ready', () => {
      console.log(`[ImapDaemon 24/7]: ✓ Connected and authenticated to ${this.currentHost}! Opening INBOX...`);
      this.isConnected = true;
      this.lastError = null;
      this.lastPingTime = Date.now();
      this.lastSyncedAt = new Date().toISOString();

      client.openBox('INBOX', true, (err, box) => {
        if (err) {
          console.error('[ImapDaemon]: Failed to open INBOX:', err.message);
          this.scheduleReconnect(5000);
          return;
        }

        this.totalInboxMessages = box.messages.total;
        console.log(`[ImapDaemon 24/7]: INBOX open! Total messages: ${this.totalInboxMessages}. Indexing recent payment alerts...`);

        // Index latest 50 messages into cache immediately
        this.indexRecentMessages(client, box);

        // Setup 25s keepalive heartbeat
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = setInterval(() => {
          if (this.isConnected && this.imap) {
            this.lastPingTime = Date.now();
            try {
              this.imap.status('INBOX', (statusErr, statusBox: any) => {
                if (statusErr) {
                  console.warn('[ImapDaemon Heartbeat status warning]:', statusErr.message);
                } else if (statusBox && statusBox.messages !== undefined) {
                  const total = typeof statusBox.messages === 'object' ? statusBox.messages.total : Number(statusBox.messages);
                  if (total > this.totalInboxMessages) {
                    const diff = total - this.totalInboxMessages;
                    console.log(`[ImapDaemon]: Detected new messages (${total} > ${this.totalInboxMessages}, +${diff}) via heartbeat!`);
                    this.totalInboxMessages = total;
                    this.fetchLatestMessages(client, Math.max(diff + 2, 5));
                  }
                }
              });
            } catch {
              // Ignore
            }
          }
        }, 25000);

        // Setup 5s polling check on open box for instant payment pickup
        if (this.pollTimer) clearInterval(this.pollTimer);
        this.pollTimer = setInterval(() => {
          if (this.isConnected && this.imap) {
            try {
              this.imap.status('INBOX', (e, b: any) => {
                if (!e && b && b.messages !== undefined) {
                  const total = typeof b.messages === 'object' ? b.messages.total : Number(b.messages);
                  if (total > this.totalInboxMessages) {
                    const diff = total - this.totalInboxMessages;
                    this.totalInboxMessages = total;
                    console.log(`[ImapDaemon 24/7]: Instant new mail detected (+${diff}). Fetching latest alerts...`);
                    this.fetchLatestMessages(client, Math.max(diff + 2, 5));
                  }
                }
              });
            } catch {
              // Ignore
            }
          }
        }, 5000);

        // Event listener for incoming mail from IMAP IDLE
        client.on('mail', (numNewMsgs) => {
          console.log(`[ImapDaemon 24/7]: 'mail' event received! New messages count: ${numNewMsgs}`);
          this.fetchLatestMessages(client, Math.max(numNewMsgs + 1, 5));
        });
      });
    });

    try {
      client.connect();
    } catch (err: any) {
      console.error('[ImapDaemon connect exception]:', err.message);
      this.scheduleReconnect(5000);
    }
  }

  /**
   * Fetches the newest N messages from open INBOX.
   */
  public fetchLatestMessages(client: Imap, count: number = 8): void {
    if (!this.isConnected || !client) return;

    try {
      const total = this.totalInboxMessages;
      if (total === 0) return;

      const fetchCount = Math.min(count, total);
      const startSeq = Math.max(1, total - fetchCount + 1);

      const fetchStream = client.seq.fetch(`${startSeq}:${total}`, {
        bodies: '',
        struct: true,
      });

      fetchStream.on('error', (fetchErr: any) => {
        console.warn('[ImapDaemon fetchStream warning]:', fetchErr.message);
      });

      fetchStream.on('message', (msg, seqno) => {
        msg.on('body', (stream) => {
          stream.on('error', () => {});
          simpleParser(stream as any)
            .then((parsed) => {
              this.processIncomingEmail(parsed, seqno);
            })
            .catch(() => {});
        });
      });
    } catch (err: any) {
      console.warn('[ImapDaemon fetchLatestMessages error]:', err.message);
    }
  }

  /**
   * Indexes the latest 50 messages on initial connect.
   */
  private indexRecentMessages(client: Imap, box: Imap.Box): void {
    const total = box.messages.total;
    if (total === 0) return;

    const count = Math.min(50, total);
    const startSeq = Math.max(1, total - count + 1);

    const fetchStream = client.seq.fetch(`${startSeq}:${total}`, {
      bodies: '',
      struct: true,
    });

    fetchStream.on('error', (err: any) => {
      console.warn('[ImapDaemon indexRecentMessages stream error]:', err.message);
    });

    fetchStream.on('message', (msg, seqno) => {
      msg.on('body', (stream) => {
        stream.on('error', () => {});
        simpleParser(stream as any)
          .then((parsed) => {
            this.processIncomingEmail(parsed, seqno);
          })
          .catch(() => {});
      });
    });

    fetchStream.once('end', () => {
      this.lastSyncedAt = new Date().toISOString();
      console.log(
        `[ImapDaemon 24/7]: Initial index complete. Cached ${this.cachedPaymentEmails.length} verified payment credit alerts!`
      );
    });
  }

  /**
   * Parses an email and, if it is a genuine payment credit alert, stores it in memory cache.
   */
  public processIncomingEmail(parsed: any, seqno: number): CachedPaymentEmail | null {
    const subject = (parsed.subject || '').trim();
    const fromAddress = (parsed.from?.text || '').toLowerCase();
    const date = parsed.date ? parsed.date.getTime() : Date.now();
    const rawBody = (parsed.text || '') + ' ' + (parsed.html ? parsed.html.replace(/<[^>]+>/g, ' ') : '');
    const cleanText = rawBody.replace(/\s+/g, ' ');
    const fullText = `${subject} ${fromAddress} ${cleanText}`.toLowerCase();

    // 1. Exclude security alerts / non-payment senders
    if (
      fromAddress.includes('accounts.google.com') ||
      fromAddress.includes('getgitguardian.com') ||
      fromAddress.includes('github.com') ||
      fromAddress.includes('linkedin.com') ||
      fromAddress.includes('coderabbit.ai') ||
      fromAddress.includes('telegram.org') ||
      fromAddress.includes('spaceship.com') ||
      subject.toLowerCase().includes('security') ||
      subject.toLowerCase().includes('secret exposed') ||
      subject.toLowerCase().includes('verify account')
    ) {
      return null;
    }

    // 2. Check if sender/content is payment related
    const isPaymentSender =
      fromAddress.includes('famapp') ||
      fromAddress.includes('fampay') ||
      fromAddress.includes('idfc') ||
      fromAddress.includes('triotech') ||
      fromAddress.includes('phonepe') ||
      fromAddress.includes('paytm') ||
      fromAddress.includes('google') ||
      fromAddress.includes('gpay') ||
      fromAddress.includes('bank') ||
      fromAddress.includes('ippbonline') ||
      fromAddress.includes('axis') ||
      fromAddress.includes('hdfc') ||
      fromAddress.includes('icici') ||
      fromAddress.includes('sbi') ||
      fromAddress.includes('kotak') ||
      fromAddress.includes('airtel') ||
      subject.toLowerCase().includes('fam') ||
      subject.toLowerCase().includes('upi') ||
      subject.toLowerCase().includes('received') ||
      subject.toLowerCase().includes('credited');

    if (!isPaymentSender) return null;

    // 3. Must be a credit / inward transaction
    const isCredit =
      subject.toLowerCase().includes('received') ||
      subject.toLowerCase().includes('credited') ||
      subject.toLowerCase().includes('successful') ||
      cleanText.toLowerCase().includes('successfully received') ||
      cleanText.toLowerCase().includes('received') ||
      cleanText.toLowerCase().includes('credited') ||
      cleanText.toLowerCase().includes('added to your wallet') ||
      cleanText.toLowerCase().includes('added to your famx');

    if (!isCredit) return null;

    // 4. Extract Amount
    // FamApp formats:
    // "You have successfully received ₹1.0 from ..."
    // "You received ₹10.0 in your FamX account"
    // "Your updated balance is ₹66.0"
    const amtMatch =
      cleanText.match(/(?:successfully\s+received|received|credited|added|deposited)\s+(?:₹|rs\.?|inr)?\s*([0-9]+(?:\.[0-9]{1,2})?)/i) ||
      subject.match(/(?:received|credited)\s+(?:₹|rs\.?|inr)?\s*([0-9]+(?:\.[0-9]{1,2})?)/i) ||
      cleanText.match(/(?:₹|rs\.?|inr)\s*([0-9]+(?:\.[0-9]{1,2})?)/i);

    if (!amtMatch) return null;
    const amount = parseFloat(amtMatch[1]);
    if (isNaN(amount) || amount <= 0) return null;

    // 5. Extract UTR / RRN
    // FamApp format: "UTR: 005578765632"
    const utrMatch =
      cleanText.match(/UTR[:\s#]+([0-9]{8,16})/i) ||
      cleanText.match(/UPI\s*Ref(?:erence)?[:\s#]+([0-9]{8,16})/i) ||
      cleanText.match(/RRN[:\s#]+([0-9]{8,16})/i) ||
      cleanText.match(/Ref\s*(?:no|number)?[:\s#]+([0-9]{8,16})/i) ||
      cleanText.match(/\b([0-9]{12})\b/);

    const utr = utrMatch ? (utrMatch[1] || utrMatch[0]) : '';

    // 6. Extract Transaction ID
    // FamApp format: "with transaction id FMPIB6728050278"
    const txnMatch =
      cleanText.match(/transaction\s*(?:id|ref)[:\s#]+([A-Z0-9_-]+)/i) ||
      cleanText.match(/(FMPIB[A-Z0-9]+)/i) ||
      cleanText.match(/(FPX-[A-Z0-9-]+)/i);

    const transactionId = txnMatch ? (txnMatch[1] || txnMatch[0]) : (utr || `TXN-${Date.now()}`);

    // Check if already in cache (avoid duplicates by UTR or transactionId)
    const existing = this.cachedPaymentEmails.find(
      (c) => (utr && c.utr === utr) || (transactionId && c.transactionId === transactionId)
    );

    if (existing) {
      return existing;
    }

    const cachedItem: CachedPaymentEmail = {
      uid: seqno,
      date,
      amount,
      utr: utr || `UTR-${Date.now()}`,
      transactionId,
      sender: fromAddress,
      subject,
      cleanText,
    };

    this.cachedPaymentEmails.unshift(cachedItem);
    // Keep max 200 items in memory
    if (this.cachedPaymentEmails.length > 200) {
      this.cachedPaymentEmails.pop();
    }

    this.lastSyncedAt = new Date().toISOString();

    console.log(
      `[ImapDaemon 24/7 NEW PAYMENT INDEXED]: ₹${amount} INR | UTR: ${cachedItem.utr} | Txn: ${transactionId} | Time: ${new Date(date).toLocaleTimeString()}`
    );

    // Notify listeners (e.g. background poller)
    for (const listener of this.paymentListeners) {
      try {
        listener(cachedItem);
      } catch {
        // Ignore
      }
    }

    return cachedItem;
  }

  /**
   * Looks up a payment in the high-speed warm cache.
   * If not in cache, does a rapid fetch on the live open box.
   */
  public async findPayment(
    targetAmount: number,
    targetUtr?: string,
    minTimestamp?: number,
    usedUtrs: string[] = []
  ): Promise<CachedPaymentEmail | null> {
    const amt = Number(targetAmount);
    const cleanUtr = (targetUtr || '').replace(/[^a-zA-Z0-9]/g, '').trim();

    // 1. Scan in-memory cache first (sub-millisecond instant!)
    for (const item of this.cachedPaymentEmails) {
      // Amount must match
      if (Math.abs(item.amount - amt) > 0.01) continue;

      // UTR must not be previously claimed
      if (usedUtrs.includes(item.utr)) continue;

      // Timestamp check with generous 12-hour window for clock differences
      if (minTimestamp && item.date < minTimestamp - 12 * 3600 * 1000) continue;

      // If specific UTR requested, verify it matches
      if (cleanUtr && cleanUtr.length >= 6) {
        const matchesUtr =
          item.utr === cleanUtr ||
          item.cleanText.includes(cleanUtr) ||
          item.transactionId === cleanUtr;

        if (!matchesUtr) continue;
      }

      return item;
    }

    // 2. If not found in cache and daemon is connected, fetch the latest 12 messages from server
    if (this.isConnected && this.imap) {
      this.fetchLatestMessages(this.imap, 12);
      // Give 600ms for parsing to settle
      await new Promise((r) => setTimeout(r, 600));

      for (const item of this.cachedPaymentEmails) {
        if (Math.abs(item.amount - amt) > 0.01) continue;
        if (usedUtrs.includes(item.utr)) continue;
        if (minTimestamp && item.date < minTimestamp - 12 * 3600 * 1000) continue;

        if (cleanUtr && cleanUtr.length >= 6) {
          const matchesUtr =
            item.utr === cleanUtr ||
            item.cleanText.includes(cleanUtr) ||
            item.transactionId === cleanUtr;
          if (!matchesUtr) continue;
        }

        return item;
      }
    }

    return null;
  }

  /**
   * Returns live daemon telemetry and status
   */
  public getStatus(): ImapDaemonStatus {
    const uptimeSeconds = this.startedAt > 0 ? Math.floor((Date.now() - this.startedAt) / 1000) : 0;
    return {
      connected: this.isConnected,
      email: this.currentEmail || 'Not configured',
      host: this.currentHost,
      port: this.currentPort,
      totalInboxMessages: this.totalInboxMessages,
      cachedPaymentsCount: this.cachedPaymentEmails.length,
      lastError: this.lastError,
      lastPingTime: this.lastPingTime,
      uptimeSeconds,
      lastSyncedAt: this.lastSyncedAt,
    };
  }
}

export class ImapService {
  // Singleton 24/7 background daemon instance
  public static daemon = new ImapDaemon();

  /**
   * Helper to resolve the correct IMAP server host based on email domain
   */
  public static resolveHost(email: string, customHost?: string): string {
    if (customHost && customHost.trim()) return customHost.trim();
    const domain = (email || '').toLowerCase().split('@')[1] || '';
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
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanAppPass = (appPassword || '').replace(/\s+/g, '');

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
        connTimeout: 15000,
        authTimeout: 15000,
      };

      const client = new Imap(imapConfig);
      let finished = false;

      const complete = (res: { success: boolean; message: string; totalEmails?: number; host?: string }) => {
        if (!finished) {
          finished = true;
          try {
            client.removeAllListeners();
            client.on('error', () => {});
            client.end();
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
          message: `Connection to mail server ${host}:${customPort || 993} timed out after 15 seconds. Check network or App Password.`,
        });
      }, 15000);

      client.on('error', (err: any) => {
        clearTimeout(timer);
        let errorMsg = `IMAP Authentication Error on ${host}: ` + (err.message || 'Unknown error');
        if (err.message && (err.message.includes('AUTHENTICATIONFAILED') || err.message.includes('Invalid credentials'))) {
          errorMsg = `Login Failed on ${host} for ${cleanEmail}: Invalid App Password or IMAP is disabled in your email account settings.`;
        }
        complete({ success: false, host, message: errorMsg });
      });

      client.once('ready', () => {
        client.openBox('INBOX', true, (err, box) => {
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

      try {
        client.connect();
      } catch (e: any) {
        clearTimeout(timer);
        complete({ success: false, host, message: e.message || 'Connection failed' });
      }
    });
  }

  /**
   * Connects to IMAP or checks warm 24/7 daemon cache.
   * Accurately verifies genuine FamPay, FamApp, IDFC FIRST Bank, PhonePe, GPay, Paytm, and Bank UPI alerts.
   * STRICT ANTI-FAKE VERIFICATION: If user provides a UTR, it MUST exist in a real bank credit email!
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
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanAppPass = (appPassword || '').replace(/\s+/g, '');
    const cleanUtr = (providedUtr || '').replace(/[^a-zA-Z0-9]/g, '').trim();

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

    // 1. First, check the 24/7 warm daemon cache (sub-millisecond instant check!)
    const cachedMatch = await this.daemon.findPayment(targetAmount, cleanUtr || undefined, minTimestamp, usedUtrs);

    if (cachedMatch) {
      console.log(`[ImapService]: ✓ Real-time match verified via 24/7 daemon cache! UTR: ${cachedMatch.utr}`);
      return {
        success: true,
        message: `FamPay payment of ₹${cachedMatch.amount.toFixed(2)} verified via IMAP! Bank UTR: ${cachedMatch.utr}`,
        emailSubject: cachedMatch.subject,
        sender: cachedMatch.sender,
        utr: cachedMatch.utr,
        transactionId: cachedMatch.transactionId,
        matchedAmount: cachedMatch.amount,
      };
    }

    // 2. If not found in cache and daemon is not tracking this exact email, run on-demand check
    const host = this.resolveHost(cleanEmail, customHost);

    return new Promise((resolve) => {
      const imapConfig: Imap.Config = {
        user: cleanEmail,
        password: cleanAppPass,
        host,
        port: customPort || 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        connTimeout: 12000,
        authTimeout: 12000,
      };

      const imap = new Imap(imapConfig);
      let resolved = false;

      const finish = (result: ImapVerificationResult) => {
        if (!resolved) {
          resolved = true;
          try {
            imap.removeAllListeners();
            imap.on('error', () => {});
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
      }, 12000);

      imap.on('error', (err: any) => {
        clearTimeout(timer);
        let errorMsg = `IMAP Verification Error on ${host}: ` + (err.message || 'Unknown error');
        if (err.message && (err.message.includes('AUTHENTICATIONFAILED') || err.message.includes('Invalid credentials'))) {
          errorMsg = `Login Failed on ${host} for ${cleanEmail}: Invalid App Password.`;
        }
        finish({
          success: false,
          message: errorMsg,
        });
      });

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

          // Check latest 35 emails
          const fetchCount = Math.min(35, totalMessages);
          const startSeq = Math.max(1, totalMessages - fetchCount + 1);
          const fetchStream = imap.seq.fetch(`${startSeq}:${totalMessages}`, {
            bodies: '',
            struct: true,
          });

          fetchStream.on('error', (fetchErr: any) => {
            clearTimeout(timer);
            return finish({
              success: false,
              message: `Failed reading emails via IMAP from ${host}: ` + fetchErr.message,
            });
          });

          const parsePromises: Promise<any>[] = [];
          let matchFound = false;

          fetchStream.on('message', (msg, seqno) => {
            msg.on('body', (stream) => {
              stream.on('error', () => {});
              const p = simpleParser(stream as any)
                .then((parsed) => {
                  if (matchFound) return;

                  const subject = (parsed.subject || '').trim();
                  const fromAddress = (parsed.from?.text || '').toLowerCase();
                  const date = parsed.date ? parsed.date.getTime() : 0;
                  const bodyText = (parsed.text || '') + ' ' + (parsed.html ? parsed.html.replace(/<[^>]+>/g, ' ') : '');
                  const cleanText = bodyText.replace(/\s+/g, ' ');

                  // Exclude security alerts
                  if (
                    fromAddress.includes('accounts.google.com') ||
                    fromAddress.includes('getgitguardian.com') ||
                    fromAddress.includes('github.com') ||
                    fromAddress.includes('linkedin.com') ||
                    subject.toLowerCase().includes('security') ||
                    subject.toLowerCase().includes('verify account')
                  ) {
                    return;
                  }

                  // Generous buffer for clock difference
                  const sessionCutoff = minTimestamp ? minTimestamp - 12 * 3600 * 1000 : (Date.now() - 7 * 24 * 3600 * 1000);
                  if (sessionCutoff > 0 && date > 0 && date < sessionCutoff) {
                    return;
                  }

                  // Must be payment ecosystem
                  const isPaymentEcosystem =
                    fromAddress.includes('famapp') ||
                    fromAddress.includes('fampay') ||
                    fromAddress.includes('idfc') ||
                    fromAddress.includes('triotech') ||
                    fromAddress.includes('phonepe') ||
                    fromAddress.includes('paytm') ||
                    fromAddress.includes('google') ||
                    fromAddress.includes('gpay') ||
                    fromAddress.includes('bank') ||
                    fromAddress.includes('ippbonline') ||
                    subject.toLowerCase().includes('fam') ||
                    subject.toLowerCase().includes('upi') ||
                    subject.toLowerCase().includes('received') ||
                    subject.toLowerCase().includes('credited');

                  if (!isPaymentEcosystem) return;

                  // Must be credit
                  const isCredit =
                    subject.toLowerCase().includes('received') ||
                    subject.toLowerCase().includes('credited') ||
                    subject.toLowerCase().includes('successful') ||
                    cleanText.toLowerCase().includes('successfully received') ||
                    cleanText.toLowerCase().includes('received') ||
                    cleanText.toLowerCase().includes('credited') ||
                    cleanText.toLowerCase().includes('added');

                  if (!isCredit) return;

                  // Amount matching
                  const amt = Number(targetAmount);
                  const amtStr = amt.toString();
                  const amtDec1 = amt.toFixed(1);
                  const amtDec2 = amt.toFixed(2);

                  const amtMatch =
                    cleanText.match(/(?:successfully\s+received|received|credited|added|deposited)\s+(?:₹|rs\.?|inr)?\s*([0-9]+(?:\.[0-9]{1,2})?)/i) ||
                    subject.match(/(?:received|credited)\s+(?:₹|rs\.?|inr)?\s*([0-9]+(?:\.[0-9]{1,2})?)/i) ||
                    cleanText.match(/(?:₹|rs\.?|inr)\s*([0-9]+(?:\.[0-9]{1,2})?)/i);

                  let parsedAmt = amtMatch ? parseFloat(amtMatch[1]) : NaN;
                  let hasAmount = !isNaN(parsedAmt) && Math.abs(parsedAmt - amt) < 0.01;

                  if (!hasAmount) {
                    if (
                      cleanText.includes(`₹${amtStr}`) ||
                      cleanText.includes(`₹${amtDec1}`) ||
                      cleanText.includes(`₹${amtDec2}`) ||
                      cleanText.includes(`rs ${amtStr}`) ||
                      cleanText.includes(`rs. ${amtStr}`) ||
                      cleanText.includes(`inr ${amtStr}`) ||
                      subject.includes(`₹${amtStr}`) ||
                      subject.includes(`₹${amtDec1}`) ||
                      subject.includes(`₹${amtDec2}`)
                    ) {
                      hasAmount = true;
                    }
                  }

                  if (!hasAmount) return;

                  // Extract UTR
                  const utrMatch =
                    cleanText.match(/UTR[:\s#]+([0-9]{8,16})/i) ||
                    cleanText.match(/UPI\s*Ref(?:erence)?[:\s#]+([0-9]{8,16})/i) ||
                    cleanText.match(/RRN[:\s#]+([0-9]{8,16})/i) ||
                    cleanText.match(/Ref\s*(?:no|number)?[:\s#]+([0-9]{8,16})/i) ||
                    cleanText.match(/\b([0-9]{12})\b/);

                  const extractedUtr = utrMatch ? (utrMatch[1] || utrMatch[0]) : '';

                  // Extract Transaction ID
                  const txnMatch =
                    cleanText.match(/transaction\s*(?:id|ref)[:\s#]+([A-Z0-9_-]+)/i) ||
                    cleanText.match(/(FMPIB[A-Z0-9]+)/i) ||
                    cleanText.match(/(FPX-[A-Z0-9-]+)/i);

                  const extractedTxnId = txnMatch ? (txnMatch[1] || txnMatch[0]) : (extractedUtr || transactionRef || '');

                  // STRICT UTR CHECK: If customer entered a UTR, verify that it matches this email
                  if (cleanUtr && cleanUtr.length >= 6) {
                    const matchesUtr =
                      extractedUtr === cleanUtr ||
                      cleanText.includes(cleanUtr) ||
                      extractedTxnId === cleanUtr;

                    if (!matchesUtr) return;
                  }

                  // Anti-Replay: Prevent reusing a UTR that was already claimed
                  if (extractedUtr && usedUtrs.includes(extractedUtr)) {
                    return;
                  }

                  matchFound = true;
                  clearTimeout(timer);

                  return finish({
                    success: true,
                    message: `FamPay payment of ₹${amt.toFixed(2)} verified via IMAP! Bank UTR: ${extractedUtr}`,
                    emailSubject: subject,
                    sender: fromAddress,
                    utr: extractedUtr || `UTR-${Date.now()}`,
                    transactionId: extractedTxnId || extractedUtr,
                    matchedAmount: amt,
                  });
                })
                .catch(() => {});

              parsePromises.push(p);
            });
          });

          fetchStream.once('end', () => {
            Promise.all(parsePromises).then(() => {
              if (!matchFound && !resolved) {
                clearTimeout(timer);
                finish({
                  success: false,
                  message: cleanUtr
                    ? `Payment NOT verified. Bank records show no credit of ₹${targetAmount} with UTR "${cleanUtr}". Please check your payment receipt.`
                    : `Payment NOT verified. No new FamPay payment alert found in ${cleanEmail} for ₹${targetAmount}.`,
                });
              }
            });
          });
        });
      });

      try {
        imap.connect();
      } catch (err: any) {
        clearTimeout(timer);
        finish({
          success: false,
          message: 'Connection to mail server failed: ' + (err.message || 'Unknown error'),
        });
      }
    });
  }

  /**
   * Diagnostic simulation helper to test email parsing rules
   */
  public static parseEmailBodyAndSubject(
    subject: string,
    fromAddress: string,
    body: string,
    targetAmount: number,
    providedUtr?: string,
    transactionRef?: string
  ): {
    isMatch: boolean;
    isUpiEcosystem: boolean;
    hasPaymentKeywords: boolean;
    hasAmountWithCurrency: boolean;
    hasUtrMatch: boolean;
    hasRefMatch: boolean;
    extractedUtr: string;
    extractedTxnId: string;
  } {
    const cleanText = (body || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const fullText = `${subject} ${fromAddress} ${cleanText}`.toLowerCase();
    const cleanUtr = (providedUtr || '').replace(/[^a-zA-Z0-9]/g, '').trim();

    const isFamPayOrUpi =
      fromAddress.toLowerCase().includes('famapp') ||
      fromAddress.toLowerCase().includes('fampay') ||
      fromAddress.toLowerCase().includes('idfc') ||
      fromAddress.toLowerCase().includes('phonepe') ||
      fromAddress.toLowerCase().includes('paytm') ||
      fromAddress.toLowerCase().includes('google') ||
      fromAddress.toLowerCase().includes('gpay') ||
      fromAddress.toLowerCase().includes('bank') ||
      subject.toLowerCase().includes('fam') ||
      subject.toLowerCase().includes('upi') ||
      cleanText.toLowerCase().includes('fam');

    const isCredit =
      subject.toLowerCase().includes('received') ||
      subject.toLowerCase().includes('credited') ||
      subject.toLowerCase().includes('successful') ||
      fullText.includes('received') ||
      fullText.includes('credited');

    const amt = Number(targetAmount);
    const amtStr = amt.toString();
    const amtDec1 = amt.toFixed(1);
    const amtDec2 = amt.toFixed(2);

    const amountPatterns = [
      new RegExp(`(?:₹|rs\\.?|inr)\\s*(${amtStr}|${amtDec1}|${amtDec2})(?!\\d)`, 'i'),
      new RegExp(`(?:successfully\\s+received|received)\\s+(?:₹|rs\\.?|inr)?\\s*(${amtStr}|${amtDec1}|${amtDec2})(?!\\d)`, 'i'),
      new RegExp(`credited\\s+(?:with|by)?\\s*(?:₹|rs\\.?|inr)?\\s*(${amtStr}|${amtDec1}|${amtDec2})(?!\\d)`, 'i'),
      new RegExp(`(${amtStr}|${amtDec1}|${amtDec2})\\s*(?:inr|rs|₹|in your famx)`, 'i'),
    ];

    const hasAmountWithCurrency = amountPatterns.some((p) => p.test(fullText));

    const utrMatch =
      cleanText.match(/UTR[:\s#]+([0-9]{8,16})/i) ||
      cleanText.match(/UPI\s*Ref(?:erence)?[:\s#]+([0-9]{8,16})/i) ||
      cleanText.match(/RRN[:\s#]+([0-9]{8,16})/i) ||
      cleanText.match(/\b([0-9]{12})\b/);

    const extractedUtr = utrMatch ? (utrMatch[1] || utrMatch[0]) : '';

    const txnMatch =
      cleanText.match(/transaction\s*(?:id|ref)[:\s#]+([A-Z0-9_-]+)/i) ||
      cleanText.match(/(FMPIB[A-Z0-9]+)/i);

    const extractedTxnId = txnMatch ? txnMatch[1] : (transactionRef || extractedUtr || '');

    let utrMatches = true;
    if (cleanUtr && cleanUtr.length >= 6) {
      utrMatches = extractedUtr === cleanUtr || cleanText.includes(cleanUtr) || extractedTxnId === cleanUtr;
    }

    const isMatch = isFamPayOrUpi && isCredit && hasAmountWithCurrency && (cleanUtr ? utrMatches : !!extractedUtr);

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
