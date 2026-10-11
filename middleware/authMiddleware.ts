import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { dbService, UserRecord } from '../database/db.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'fampayx_jwt_secret_key_prod_2026_change_me';

export interface AuthenticatedRequest extends Request {
  user?: UserRecord;
}

export function generateJwtToken(user: UserRecord): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      email_verified: user.email_verified,
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please log in or verify your account.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email?: string };
    let user = await dbService.findUserById(decoded.id);

    if (!user && decoded.email) {
      user = await dbService.findUserByEmail(decoded.email);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User account not found.',
      });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired session token. Please log in again.',
    });
  }
}

export async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  await requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Administrative privileges required.',
      });
    }
    next();
  });
}

export async function requireApiKey(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let rawKey: any = 
    req.headers['x-api-key'] || 
    req.headers['X-Api-Key'] || 
    req.headers['x-apikey'] || 
    req.headers['api-key'] || 
    req.headers['apikey'] || 
    req.headers['key'] || 
    req.headers['merchant-id'] || 
    req.headers['merchant_id'] || 
    req.query.api_key || 
    req.query.apiKey || 
    req.query.merchant_id || 
    req.query.merchantId || 
    req.query.user_id || 
    req.query.userId || 
    req.query.key || 
    req.query.token || 
    (req.body && (
      req.body.api_key || 
      req.body.apiKey || 
      req.body.merchant_id || 
      req.body.merchantId || 
      req.body.merchant_key || 
      req.body.merchantKey || 
      req.body.user_id || 
      req.body.userId || 
      req.body.key || 
      req.body.token || 
      req.body.secret_key
    ));

  if (!rawKey && req.headers.authorization) {
    const auth = String(req.headers.authorization).trim();
    if (auth.toLowerCase().startsWith('bearer ')) {
      rawKey = auth.substring(7).trim();
    } else {
      rawKey = auth;
    }
  }

  let cleanKey = rawKey ? String(rawKey).trim().replace(/^["']|["']$/g, '') : '';

  if (!cleanKey) {
    return res.status(401).json({
      status: 'unauthorized',
      success: false,
      message: 'Invalid api_key: Missing API key or Merchant ID. Pass X-Api-Key header, api_key parameter, or merchant_id.',
      error: 'API Key or Merchant ID is missing.',
    });
  }

  const user = await dbService.findUserByApiKey(cleanKey);

  if (!user) {
    return res.status(401).json({
      status: 'unauthorized',
      success: false,
      message: `Invalid api_key or merchant_id: '${cleanKey}' does not match any registered merchant.`,
      error: 'Invalid API Key or Merchant ID.',
    });
  }

  req.user = user;
  next();
}
