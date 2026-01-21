import { Router, Response, Request } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import logger from '../utils/logger';
import { config } from '../config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const prisma = new PrismaClient();

// Ensure storage directory exists
const ensureStorageDir = async () => {
  const storagePath = config.storage.path;
  try {
    await fs.mkdir(storagePath, { recursive: true });
  } catch (error) {
    logger.error('Failed to create storage directory', error);
  }
};

// List artifacts for a run
router.get('/runs/:runId/artifacts', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId } = req;
    const { runId } = req.params;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify run belongs to tenant
    const run = await prisma.run.findFirst({
      where: {
        id: runId,
        tenantId,
      },
    });

    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    const artifacts = await prisma.artifact.findMany({
      where: { runId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      artifacts: artifacts.map(a => ({
        id: a.id,
        runId: a.runId,
        type: a.type,
        uri: a.uri,
        metadata: a.metadata ? JSON.parse(a.metadata) : null,
        createdAt: a.createdAt,
      })),
    });
  } catch (error: any) {
    logger.error('Error listing artifacts', error);
    res.status(500).json({ error: 'Failed to list artifacts' });
  }
});

// Get artifact by ID
router.get('/artifacts/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId } = req;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const artifact = await prisma.artifact.findFirst({
      where: {
        id,
        run: {
          tenantId,
        },
      },
    });

    if (!artifact) {
      return res.status(404).json({ error: 'Artifact not found' });
    }

    // If local storage, serve the file
    if (config.storage.type === 'local' && artifact.uri.startsWith('/')) {
      const filePath = path.join(config.storage.path, artifact.uri);
      try {
        const stats = await fs.stat(filePath);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Length', stats.size.toString());
        res.sendFile(path.resolve(filePath));
        return;
      } catch (error) {
        return res.status(404).json({ error: 'File not found' });
      }
    }

    res.json({
      id: artifact.id,
      runId: artifact.runId,
      type: artifact.type,
      uri: artifact.uri,
      metadata: artifact.metadata ? JSON.parse(artifact.metadata) : null,
      createdAt: artifact.createdAt,
    });
  } catch (error: any) {
    logger.error('Error getting artifact', error);
    res.status(500).json({ error: 'Failed to get artifact' });
  }
});

// Upload artifact for a run
router.post('/runs/:runId/artifacts', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId } = req;
    const { runId } = req.params;
    const { type, uri, metadata } = req.body;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify run belongs to tenant
    const run = await prisma.run.findFirst({
      where: {
        id: runId,
        tenantId,
      },
    });

    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    if (!type || !uri) {
      return res.status(400).json({ error: 'Missing type or uri' });
    }

    const artifact = await prisma.artifact.create({
      data: {
        runId,
        type,
        uri,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    logger.info(`Artifact created: ${artifact.id}`, { tenantId, runId, type });

    res.status(201).json({
      id: artifact.id,
      runId: artifact.runId,
      type: artifact.type,
      uri: artifact.uri,
      metadata: metadata,
      createdAt: artifact.createdAt,
    });
  } catch (error: any) {
    logger.error('Error creating artifact', error);
    res.status(500).json({ error: 'Failed to create artifact' });
  }
});

// Store artifact file (multipart upload)
router.post('/runs/:runId/artifacts/upload', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await ensureStorageDir();
    const { tenantId } = req;
    const { runId } = req.params;
    const { type, name } = req.body;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify run belongs to tenant
    const run = await prisma.run.findFirst({
      where: {
        id: runId,
        tenantId,
      },
    });

    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    // For now, handle simple text/JSON uploads
    // In production, use multer or similar for file uploads
    const content = req.body.content || req.body;
    const fileName = name || `${uuidv4()}.txt`;
    const filePath = path.join(config.storage.path, runId, fileName);
    
    // Ensure run directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    
    // Write file
    await fs.writeFile(filePath, typeof content === 'string' ? content : JSON.stringify(content, null, 2));
    
    const relativePath = path.join(runId, fileName).replace(/\\/g, '/');
    const metadata = {
      name: fileName,
      size: (await fs.stat(filePath)).size,
      mimeType: type || 'text/plain',
    };

    const artifact = await prisma.artifact.create({
      data: {
        runId,
        type: type || 'document',
        uri: `/storage/${relativePath}`,
        metadata: JSON.stringify(metadata),
      },
    });

    res.status(201).json({
      id: artifact.id,
      runId: artifact.runId,
      type: artifact.type,
      uri: artifact.uri,
      metadata,
      createdAt: artifact.createdAt,
    });
  } catch (error: any) {
    logger.error('Error uploading artifact', error);
    res.status(500).json({ error: 'Failed to upload artifact' });
  }
});

// Delete artifact
router.delete('/artifacts/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId } = req;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const artifact = await prisma.artifact.findFirst({
      where: {
        id,
        run: {
          tenantId,
        },
      },
    });

    if (!artifact) {
      return res.status(404).json({ error: 'Artifact not found' });
    }

    // Delete file if local storage
    if (config.storage.type === 'local' && artifact.uri.startsWith('/storage/')) {
      const filePath = path.join(config.storage.path, artifact.uri.replace('/storage/', ''));
      try {
        await fs.unlink(filePath);
      } catch (error) {
        // File might not exist, continue with deletion
      }
    }

    await prisma.artifact.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error: any) {
    logger.error('Error deleting artifact', error);
    res.status(500).json({ error: 'Failed to delete artifact' });
  }
});

export default router;
