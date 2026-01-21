import { Router, Response, Request } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { config } from '../config';
import { enqueueRun } from '../utils/redis';
import logger from '../utils/logger';
import axios from 'axios';

const router = Router();
const prisma = new PrismaClient();

// Create run (start pipeline execution)
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId } = req;
    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { pipelineId, inputs } = req.body;

    if (!pipelineId || !inputs) {
      return res.status(400).json({ error: 'Missing pipelineId or inputs' });
    }

    // Verify pipeline exists and is active
    const pipeline = await prisma.pipeline.findFirst({
      where: {
        id: pipelineId,
        tenantId,
        isActive: true,
      },
    });

    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found or inactive' });
    }

    // Create run record
    const run = await prisma.run.create({
      data: {
        tenantId,
        pipelineId,
        status: 'queued',
        inputs: JSON.stringify(inputs),
        createdBy: req.userId || null,
      },
      include: {
        pipeline: true,
      },
    });

    logger.info(`Run created: ${run.id}`, { tenantId, pipelineId });

    // Enqueue run in Redis
    await enqueueRun(run.id, 0);

    // Trigger orchestrator to start processing
    try {
      await axios.post(`${config.orchestrator.url}/api/v1/runs/${run.id}/start`, {
        runId: run.id,
        pipelineId,
        inputs,
        pipeline: {
          steps: JSON.parse(pipeline.steps),
          policies: pipeline.policies ? JSON.parse(pipeline.policies) : null,
        },
      }, {
        timeout: 5000,
      });
    } catch (error: any) {
      // Orchestrator might not be running - log but don't fail
      logger.warn(`Failed to notify orchestrator: ${error.message}`);
    }

    res.status(201).json({
      id: run.id,
      pipelineId: run.pipelineId,
      status: run.status,
      inputs: JSON.parse(run.inputs),
      createdAt: run.createdAt,
    });
  } catch (error: any) {
    logger.error('Error creating run', error);
    res.status(500).json({ error: 'Failed to create run' });
  }
});

// List runs
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId } = req;
    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 100);
    const skip = (page - 1) * pageSize;
    const pipelineId = req.query.pipelineId as string | undefined;
    const status = req.query.status as string | undefined;

    const where: any = { tenantId };
    if (pipelineId) where.pipelineId = pipelineId;
    if (status) where.status = status;

    const [runs, total] = await Promise.all([
      prisma.run.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          pipeline: {
            select: {
              id: true,
              name: true,
              version: true,
            },
          },
        },
      }),
      prisma.run.count({ where }),
    ]);

    res.json({
      data: runs.map(r => ({
        id: r.id,
        pipelineId: r.pipelineId,
        pipeline: r.pipeline,
        status: r.status,
        cost: r.cost,
        tokensUsed: r.tokensUsed,
        latencyMs: r.latencyMs,
        startedAt: r.startedAt,
        finishedAt: r.finishedAt,
        createdAt: r.createdAt,
      })),
      total,
      page,
      pageSize,
      hasMore: skip + runs.length < total,
    });
  } catch (error: any) {
    logger.error('Error listing runs', error);
    res.status(500).json({ error: 'Failed to list runs' });
  }
});

// Get run by ID
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId } = req;
    const { id } = req.params;

    const run = await prisma.run.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        pipeline: {
          select: {
            id: true,
            name: true,
            description: true,
            version: true,
          },
        },
        steps: {
          orderBy: { orderIndex: 'asc' },
        },
        artifacts: true,
        approvals: true,
      },
    });

    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    res.json({
      id: run.id,
      pipeline: run.pipeline,
      status: run.status,
      inputs: JSON.parse(run.inputs),
      outputs: run.outputs ? JSON.parse(run.outputs) : null,
      cost: run.cost,
      tokensUsed: run.tokensUsed,
      latencyMs: run.latencyMs,
      errorMessage: run.errorMessage,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      createdAt: run.createdAt,
      steps: run.steps.map(s => ({
        id: s.id,
        stepId: s.stepId,
        stepType: s.stepType,
        toolUsed: s.toolUsed,
        status: s.status,
        inputs: JSON.parse(s.inputs),
        outputs: s.outputs ? JSON.parse(s.outputs) : null,
        cost: s.cost,
        tokensUsed: s.tokensUsed,
        latencyMs: s.latencyMs,
        errorMessage: s.errorMessage,
        orderIndex: s.orderIndex,
        startedAt: s.startedAt,
        finishedAt: s.finishedAt,
      })),
      artifacts: run.artifacts,
      approvals: run.approvals,
    });
  } catch (error: any) {
    logger.error('Error getting run', error);
    res.status(500).json({ error: 'Failed to get run' });
  }
});

// Update run status (called by orchestrator)
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const run = await prisma.run.findUnique({
      where: { id },
    });

    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    const updateData: any = {};
    if (updates.status) updateData.status = updates.status;
    if (updates.outputs) updateData.outputs = typeof updates.outputs === 'string' ? JSON.stringify(updates.outputs) : JSON.stringify(updates.outputs);
    if (updates.cost !== undefined) updateData.cost = updates.cost;
    if (updates.tokensUsed !== undefined) updateData.tokensUsed = updates.tokensUsed;
    if (updates.latencyMs !== undefined) updateData.latencyMs = updates.latencyMs;
    if (updates.errorMessage) updateData.errorMessage = updates.errorMessage;
    if (updates.startedAt) updateData.startedAt = new Date(updates.startedAt);
    if (updates.finishedAt) updateData.finishedAt = new Date(updates.finishedAt);

    await prisma.run.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true });
  } catch (error: any) {
    logger.error('Error updating run status', error);
    res.status(500).json({ error: 'Failed to update run status' });
  }
});

// Get run logs
router.get('/:id/logs', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId } = req;
    const { id } = req.params;

    const run = await prisma.run.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        steps: {
          orderBy: { orderIndex: 'asc' },
          select: {
            stepId: true,
            stepType: true,
            toolUsed: true,
            status: true,
            logsUri: true,
            errorMessage: true,
            orderIndex: true,
            startedAt: true,
            finishedAt: true,
          },
        },
      },
    });

    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    res.json({
      runId: run.id,
      status: run.status,
      steps: run.steps,
    });
  } catch (error: any) {
    logger.error('Error getting run logs', error);
    res.status(500).json({ error: 'Failed to get run logs' });
  }
});

// (Re)start a run by notifying the orchestrator again
router.post('/:id/start', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId } = req;
    const { id } = req.params;
    if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });

    const run = await prisma.run.findFirst({
      where: { id, tenantId },
      include: { pipeline: true },
    });
    if (!run) return res.status(404).json({ error: 'Run not found' });

    const pipeline = run.pipeline;
    if (!pipeline || !pipeline.isActive) {
      return res.status(400).json({ error: 'Pipeline not found or inactive' });
    }

    const inputs = JSON.parse(run.inputs);

    try {
      await axios.post(
        `${config.orchestrator.url}/api/v1/runs/${run.id}/start`,
        {
          runId: run.id,
          pipelineId: run.pipelineId,
          inputs,
          pipeline: {
            steps: JSON.parse(pipeline.steps),
            policies: pipeline.policies ? JSON.parse(pipeline.policies) : null,
          },
        },
        { timeout: 5000 }
      );
    } catch (error: any) {
      logger.warn(`Failed to notify orchestrator: ${error.message}`);
      return res.status(502).json({ error: 'Failed to start run (orchestrator not reachable)' });
    }

    return res.json({ success: true });
  } catch (error: any) {
    logger.error('Error starting run', error);
    return res.status(500).json({ error: 'Failed to start run' });
  }
});

export default router;
