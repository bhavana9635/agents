import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { PipelineSchema } from '../types';
import logger from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Create pipeline
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId } = req;
    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate pipeline schema
    const pipelineData = PipelineSchema.parse(req.body);

    // Create pipeline
    const pipeline = await prisma.pipeline.create({
      data: {
        tenantId,
        name: pipelineData.name,
        description: pipelineData.description,
        inputSchema: JSON.stringify(pipelineData.inputSchema),
        outputSchema: JSON.stringify(pipelineData.outputSchema),
        steps: JSON.stringify(pipelineData.steps),
        policies: pipelineData.policies ? JSON.stringify(pipelineData.policies) : null,
        createdBy: req.userId || null,
      },
    });

    logger.info(`Pipeline created: ${pipeline.id}`, { tenantId, name: pipeline.name });

    res.status(201).json({
      id: pipeline.id,
      name: pipeline.name,
      description: pipeline.description,
      version: pipeline.version,
      inputSchema: JSON.parse(pipeline.inputSchema),
      outputSchema: JSON.parse(pipeline.outputSchema),
      steps: JSON.parse(pipeline.steps),
      policies: pipeline.policies ? JSON.parse(pipeline.policies) : null,
      isActive: pipeline.isActive,
      createdAt: pipeline.createdAt,
      updatedAt: pipeline.updatedAt,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid pipeline schema', details: error.errors });
    }
    logger.error('Error creating pipeline', error);
    res.status(500).json({ error: 'Failed to create pipeline' });
  }
});

// List pipelines
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId } = req;
    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 100);
    const skip = (page - 1) * pageSize;

    const [pipelines, total] = await Promise.all([
      prisma.pipeline.findMany({
        where: { tenantId },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.pipeline.count({ where: { tenantId } }),
    ]);

    res.json({
      data: pipelines.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        version: p.version,
        isActive: p.isActive,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
      total,
      page,
      pageSize,
      hasMore: skip + pipelines.length < total,
    });
  } catch (error: any) {
    logger.error('Error listing pipelines', error);
    res.status(500).json({ error: 'Failed to list pipelines' });
  }
});

// Get pipeline by ID
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId } = req;
    const { id } = req.params;

    const pipeline = await prisma.pipeline.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }

    res.json({
      id: pipeline.id,
      name: pipeline.name,
      description: pipeline.description,
      version: pipeline.version,
      inputSchema: JSON.parse(pipeline.inputSchema),
      outputSchema: JSON.parse(pipeline.outputSchema),
      steps: JSON.parse(pipeline.steps),
      policies: pipeline.policies ? JSON.parse(pipeline.policies) : null,
      isActive: pipeline.isActive,
      createdAt: pipeline.createdAt,
      updatedAt: pipeline.updatedAt,
    });
  } catch (error: any) {
    logger.error('Error getting pipeline', error);
    res.status(500).json({ error: 'Failed to get pipeline' });
  }
});

export default router;
