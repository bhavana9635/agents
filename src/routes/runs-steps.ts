import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const prisma = new PrismaClient();

// Create step run (called by orchestrator)
router.post('/:runId/steps', async (req: AuthRequest, res: Response) => {
  try {
    const { runId } = req.params;
    const { stepId, stepType, toolUsed, status, orderIndex, inputs } = req.body;

    // Verify run exists
    const run = await prisma.run.findUnique({
      where: { id: runId },
    });

    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    // Create step run
    const stepRun = await prisma.stepRun.create({
      data: {
        runId,
        stepId,
        stepType,
        toolUsed: toolUsed || null,
        status: status || 'pending',
        orderIndex: orderIndex || 0,
        inputs: typeof inputs === 'string' ? inputs : JSON.stringify(inputs || {}),
      },
    });

    logger.debug(`Step run created: ${stepRun.id}`, { runId, stepId });

    res.status(201).json({
      id: stepRun.id,
      stepId: stepRun.stepId,
      status: stepRun.status,
    });
  } catch (error: any) {
    logger.error('Error creating step run', error);
    res.status(500).json({ error: 'Failed to create step run' });
  }
});

// Update step run status (called by orchestrator)
router.patch('/:runId/steps/:stepId', async (req: AuthRequest, res: Response) => {
  try {
    const { runId, stepId } = req.params;
    const updates = req.body;

    const stepRun = await prisma.stepRun.findFirst({
      where: {
        runId,
        stepId,
      },
    });

    if (!stepRun) {
      return res.status(404).json({ error: 'Step run not found' });
    }

    const updateData: any = {};
    if (updates.status) updateData.status = updates.status;
    if (updates.outputs) updateData.outputs = typeof updates.outputs === 'string' ? updates.outputs : JSON.stringify(updates.outputs);
    if (updates.cost !== undefined) updateData.cost = updates.cost;
    if (updates.tokensUsed !== undefined) updateData.tokensUsed = updates.tokensUsed;
    if (updates.latencyMs !== undefined) updateData.latencyMs = updates.latencyMs;
    if (updates.errorMessage) updateData.errorMessage = updates.errorMessage;
    if (updates.startedAt) updateData.startedAt = new Date(updates.startedAt);
    if (updates.finishedAt) updateData.finishedAt = new Date(updates.finishedAt);

    await prisma.stepRun.update({
      where: { id: stepRun.id },
      data: updateData,
    });

    res.json({ success: true });
  } catch (error: any) {
    logger.error('Error updating step run', error);
    res.status(500).json({ error: 'Failed to update step run' });
  }
});

export default router;
