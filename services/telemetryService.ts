export interface VisitorSession {
  id: string;
  ip: string;
  page: string;
  referrer?: string;
  device: string;
  browser: string;
  isCheckout: boolean;
  orderAmount?: number;
  lastPing: number;
  joinedAt: number;
}

class TelemetryService {
  private activeSessions = new Map<string, VisitorSession>();

  constructor() {
    // Clean up dead sessions older than 3 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [id, session] of this.activeSessions.entries()) {
        if (now - session.lastPing > 3 * 60 * 1000) {
          this.activeSessions.delete(id);
        }
      }
    }, 15000);
  }

  public recordPing(data: {
    sessionId?: string;
    ip: string;
    page: string;
    referrer?: string;
    userAgent?: string;
    isCheckout?: boolean;
    orderAmount?: number;
  }): { sessionId: string; activeCount: number } {
    const id = data.sessionId || `sess_${Math.random().toString(36).substring(2, 10)}`;
    const now = Date.now();

    const ua = data.userAgent || '';
    const isMobile = /mobile|iphone|android|ipad/i.test(ua);
    const device = isMobile ? 'Mobile' : 'Desktop';

    let browser = 'Chrome';
    if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
    else if (/firefox/i.test(ua)) browser = 'Firefox';
    else if (/edge/i.test(ua)) browser = 'Edge';

    const existing = this.activeSessions.get(id);

    const session: VisitorSession = {
      id,
      ip: data.ip.replace('::ffff:', ''),
      page: data.page || '/',
      referrer: data.referrer || (existing?.referrer || 'Direct Visit'),
      device,
      browser,
      isCheckout: Boolean(data.isCheckout || data.page?.startsWith('/pay')),
      orderAmount: data.orderAmount || existing?.orderAmount,
      lastPing: now,
      joinedAt: existing ? existing.joinedAt : now,
    };

    this.activeSessions.set(id, session);

    return {
      sessionId: id,
      activeCount: this.getActiveCount(),
    };
  }

  public getActiveCount(): number {
    const now = Date.now();
    let count = 0;
    for (const session of this.activeSessions.values()) {
      if (now - session.lastPing < 2 * 60 * 1000) {
        count++;
      }
    }
    // Return at least 1 when website is visited
    return Math.max(1, count);
  }

  public getActiveVisitors(): VisitorSession[] {
    const now = Date.now();
    const result: VisitorSession[] = [];
    for (const session of this.activeSessions.values()) {
      if (now - session.lastPing < 2 * 60 * 1000) {
        result.push(session);
      }
    }
    return result.sort((a, b) => b.lastPing - a.lastPing);
  }
}

export const telemetryService = new TelemetryService();
