import { dbService, UpiPaymentRecord, PaymentLinkRecord } from '../database/db.ts';
import { PaymentService } from './paymentService.ts';
import { ImapService } from './imapService.ts';

export class PaymentSyncService {
  private static isRunning = false;
  private static pollTimer: NodeJS.Timeout | null = null;
  private static activeJobs: Map<string, NodeJS.Timeout[]> = new Map();

  /**
   * Starts the continuous background polling and auto-sync worker.
   */
  public static startBackgroundPoller(intervalMs: number = 6000) {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log(`[PaymentSyncService]: Background cross-referencing auto-sync service started (Interval: ${intervalMs}ms).`);

    this.pollTimer = setInterval(async () => {
      try {
        await this.runSyncCycle();
      } catch (err: any) {
        console.error('[PaymentSyncService Error in sync cycle]:', err.message);
      }
    }, intervalMs);
  }

  /**
   * Stops the background poller if needed.
   */
  public static stopBackgroundPoller() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.isRunning = false;
  }

  /**
   * Schedules staggered delayed cross-referencing checks for an individual payment.
   * Delays: 5s, 15s, 30s, 60s, 120s, 240s, 480s.
   */
  public static scheduleDelayedSync(paymentId: string) {
    const delays = [5000, 15000, 30000, 60000, 120000, 240000, 480000];
    const timers: NodeJS.Timeout[] = [];

    // Clear previous scheduled timers for this payment if any
    this.cancelScheduledSync(paymentId);

    for (const delay of delays) {
      const timer = setTimeout(async () => {
        try {
          const payment = await dbService.getPaymentById(paymentId);
          if (!payment || payment.status === 'CONFIRMED' || payment.status === 'FAILED') {
            this.cancelScheduledSync(paymentId);
            return;
          }

          console.log(`[PaymentSyncService]: Running delayed cross-reference sync for ${paymentId} (+${delay / 1000}s)`);
          const result = await PaymentService.autoDetectAndConfirm(
            paymentId,
            payment.amount,
            new Date(payment.created_at).getTime() - 300000
          );

          if (result.status === 'CONFIRMED') {
            console.log(`[PaymentSyncService]: Payment ${paymentId} successfully confirmed via delayed cross-reference!`);
            this.cancelScheduledSync(paymentId);
          }
        } catch (e: any) {
          // Ignore individual worker errors
        }
      }, delay);

      timers.push(timer);
    }

    this.activeJobs.set(paymentId, timers);
  }

  /**
   * Cancels scheduled delayed sync timers for a payment.
   */
  public static cancelScheduledSync(paymentId: string) {
    const existing = this.activeJobs.get(paymentId);
    if (existing) {
      existing.forEach((t) => clearTimeout(t));
      this.activeJobs.delete(paymentId);
    }
  }

  /**
   * Runs a single reconciliation cycle across all recent PENDING payments and ACTIVE payment links.
   */
  public static async runSyncCycle(): Promise<{ checked: number; confirmed: number }> {
    const allPayments = await dbService.getAllPayments();
    const allLinks = await dbService.getAllPaymentLinks();
    const now = Date.now();
    const maxAgeMs = 25 * 60 * 1000; // Look back up to 25 minutes

    const pendingPayments = allPayments.filter((p) => {
      if (p.status !== 'PENDING') return false;
      const createdAt = new Date(p.created_at).getTime();
      return now - createdAt < maxAgeMs;
    });

    const activeLinks = allLinks.filter((l) => {
      if (l.status !== 'ACTIVE') return false;
      const createdAt = new Date(l.created_at).getTime();
      return now - createdAt < maxAgeMs;
    });

    if (pendingPayments.length === 0 && activeLinks.length === 0) {
      return { checked: 0, confirmed: 0 };
    }

    let confirmedCount = 0;

    // 1. Sync pending direct payments
    for (const payment of pendingPayments) {
      try {
        const sinceTimestamp = new Date(payment.created_at).getTime() - 4 * 3600 * 1000;
        const res = await PaymentService.autoDetectAndConfirm(payment.id, payment.amount, sinceTimestamp);

        if (res.status === 'CONFIRMED') {
          confirmedCount++;
          this.cancelScheduledSync(payment.id);
        }
      } catch {
        // Continue
      }
    }

    // 2. Sync active checkout payment links
    for (const link of activeLinks) {
      try {
        const sinceTimestamp = new Date(link.created_at).getTime() - 4 * 3600 * 1000;
        const res = await PaymentService.autoDetectAndConfirm(link.id, link.amount, sinceTimestamp);

        if (res.status === 'CONFIRMED') {
          confirmedCount++;
        }
      } catch {
        // Continue
      }
    }

    return { checked: pendingPayments.length + activeLinks.length, confirmed: confirmedCount };
  }

  /**
   * On-demand manual or API-triggered reconciliation for a merchant or specific order.
   */
  public static async reconcileAllPendingPayments(userId?: string): Promise<{
    checked: number;
    confirmed: number;
    payments: UpiPaymentRecord[];
  }> {
    const allPayments = await dbService.getAllPayments();
    const now = Date.now();
    const maxAgeMs = 30 * 60 * 1000;

    const targetList = allPayments.filter((p) => {
      if (p.status !== 'PENDING') return false;
      if (userId && p.user_id !== userId) return false;
      const createdAt = new Date(p.created_at).getTime();
      return now - createdAt < maxAgeMs;
    });

    const newlyConfirmed: UpiPaymentRecord[] = [];

    for (const payment of targetList) {
      try {
        const res = await PaymentService.autoDetectAndConfirm(
          payment.id,
          payment.amount,
          new Date(payment.created_at).getTime() - 600000
        );

        if (res.status === 'CONFIRMED' && res.payment) {
          newlyConfirmed.push(res.payment);
          this.cancelScheduledSync(payment.id);
        }
      } catch {
        // Ignore
      }
    }

    return {
      checked: targetList.length,
      confirmed: newlyConfirmed.length,
      payments: newlyConfirmed,
    };
  }
}
