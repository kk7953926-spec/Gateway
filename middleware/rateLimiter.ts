import { Request, Response, NextFunction } from 'express';
import { dbService } from '../database/db.ts';

interface RateLimitTracker {
  count: number;
  resetTime: number;
}

const ipLimitsMap = new Map<string, RateLimitTracker>();
const emailLimitsMap = new Map<string, RateLimitTracker>();

// Clean stale trackers every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, tracker] of ipLimitsMap.entries()) {
    if (now > tracker.resetTime) ipLimitsMap.delete(ip);
  }
  for (const [email, tracker] of emailLimitsMap.entries()) {
    if (now > tracker.resetTime) emailLimitsMap.delete(email);
  }
}, 5 * 60 * 1000);

export function verificationRateLimiter(req: Request, res: Response, next: NextFunction) {
  const settings = dbService.getSettings();
  const maxRequests = settings.rateLimitPerMin || 5;
  const windowMs = 10 * 60 * 1000; // 10 minute window

  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const email = (req.body?.email || req.body?.user_email || '').toString().toLowerCase().trim();

  const now = Date.now();

  // IP limit check
  let ipTracker = ipLimitsMap.get(clientIp);
  if (!ipTracker || now > ipTracker.resetTime) {
    ipTracker = { count: 1, resetTime: now + windowMs };
    ipLimitsMap.set(clientIp, ipTracker);
  } else {
    ipTracker.count += 1;
  }

  if (ipTracker.count > maxRequests * 2) {
    dbService.addLog({
      action: 'RATE_LIMIT_EXCEEDED',
      ip: clientIp,
      status: 'WARNING',
      details: `IP ${clientIp} exceeded limit with ${ipTracker.count} requests.`,
    });
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded for your IP address. Please wait a few minutes before trying again.',
    });
  }

  // Email limit check if email is provided
  if (email) {
    let emailTracker = emailLimitsMap.get(email);
    if (!emailTracker || now > emailTracker.resetTime) {
      emailTracker = { count: 1, resetTime: now + windowMs };
      emailLimitsMap.set(email, emailTracker);
    } else {
      emailTracker.count += 1;
    }

    if (emailTracker.count > maxRequests) {
      dbService.addLog({
        user_email: email,
        action: 'RATE_LIMIT_EXCEEDED_EMAIL',
        ip: clientIp,
        status: 'WARNING',
        details: `Email ${email} requested ${emailTracker.count} verifications within window.`,
      });
      return res.status(429).json({
        success: false,
        error: `Too many verification requests for ${email}. Please wait before requesting another code.`,
      });
    }
  }

  next();
}
