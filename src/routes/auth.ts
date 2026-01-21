import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { hashPassword, comparePassword, generateApiKey, hashApiKey } from '../utils/crypto';
import logger from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Create tenant (for initial setup)
router.post('/tenants', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create tenant
    const tenant = await prisma.tenant.create({
      data: {
        name,
      },
    });

    // Create admin user
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email,
        passwordHash,
        roles: JSON.stringify(['admin', 'user']),
      },
    });

    logger.info(`Tenant created: ${tenant.id}`, { name, email });

    res.status(201).json({
      tenantId: tenant.id,
      userId: user.id,
      message: 'Tenant created successfully',
    });
  } catch (error: any) {
    logger.error('Error creating tenant', error);
    res.status(500).json({ error: 'Failed to create tenant' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password, tenantId } = req.body;

    if (!email || !password || !tenantId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = await prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email,
        },
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const roles = JSON.parse(user.roles || '["user"]');
    const token = jwt.sign(
      { tenantId: user.tenantId, userId: user.id, roles },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles,
      },
    });
  } catch (error: any) {
    logger.error('Error logging in', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Create API key
router.post('/api-keys', async (req: Request, res: Response) => {
  try {
    // In production, this should be authenticated
    const { tenantId, name, scopes, expiresInDays } = req.body;

    if (!tenantId || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const apiKey = generateApiKey();
    const keyHash = hashApiKey(apiKey);

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    await prisma.apiKey.create({
      data: {
        tenantId,
        name,
        keyHash,
        scopes: scopes ? JSON.stringify(scopes) : null,
        expiresAt,
      },
    });

    // Return the key only once
    res.status(201).json({
      apiKey,
      name,
      expiresAt,
    });
  } catch (error: any) {
    logger.error('Error creating API key', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

export default router;
