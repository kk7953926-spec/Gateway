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
  let apiKey = 
    (req.headers['x-api-key'] as string) || 
    (req.headers['X-Api-Key'] as string) || 
    (req.query.api_key as string) || 
    (req.body && req.body.api_key);

  if (!apiKey && req.headers.authorization) {
    const auth = req.headers.authorization;
    if (auth.startsWith('Bearer fam_') || auth.startsWith('Bearer fgw_')) {
      apiKey = auth.split(' ')[1];
    } else if (auth.startsWith('fam_') || auth.startsWith('fgw_')) {
      apiKey = auth;
    }
  }

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API Key is missing. Please provide it in X-Api-Key header or api_key parameter.',
    });
  }

  const user = await dbService.findUserByApiKey(String(apiKey).trim());

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Invalid API Key.',
    });
  }

  req.user = user;
  next();
}
