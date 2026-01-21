import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { hashApiKey } from '../utils/crypto';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  tenantId?: string;
  userId?: string;
  userRoles?: string[];
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const [type, token] = authHeader.split(' ');

    if (type === 'Bearer') {
      if (!token || token === 'null' || token === 'undefined') {
        return res.status(401).json({ error: 'Missing bearer token' });
      }
      // JWT token authentication (for users)
      const decoded = jwt.verify(token, config.jwt.secret) as { tenantId: string; userId: string; roles: string[] };
      req.tenantId = decoded.tenantId;
      req.userId = decoded.userId;
      req.userRoles = decoded.roles;

      // Verify user still exists
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      return next();
    }

    if (type === 'ApiKey') {
      // API key authentication (for service accounts)
      const keyHash = hashApiKey(token);
      const apiKey = await prisma.apiKey.findFirst({
        where: { keyHash },
        include: { tenant: true },
      });

      if (!apiKey) {
        return res.status(401).json({ error: 'Invalid API key' });
      }

      if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
        return res.status(401).json({ error: 'API key expired' });
      }

      // Update last used
      await prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      });

      req.tenantId = apiKey.tenantId;

      return next();
    }

    return res.status(401).json({ error: 'Invalid authorization type' });
  } catch (error) {
    // Common/expected failure mode (bad token). Keep logs low-noise.
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError || error instanceof jwt.NotBeforeError) {
      logger.warn('Authentication failed', { name: error.name, message: error.message });
      return res.status(401).json({ error: 'Invalid token' });
    }
    logger.error('Authentication error', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRoles) {
      return res.status(403).json({ error: 'User roles not available' });
    }

    const hasRole = req.userRoles.some(role => roles.includes(role));
    if (!hasRole) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}
