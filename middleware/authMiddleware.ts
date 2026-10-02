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
  const apiKey = req.headers['x-api-key'] || req.query.api_key;

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API Key is missing. Please provide it in x-api-key header.',
    });
  }

  const users = await dbService.getAllUsers();
  const user = users.find((u) => u.api_key === apiKey);

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Invalid API Key.',
    });
  }

  req.user = user;
  next();
}
