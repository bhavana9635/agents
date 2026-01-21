import { Router, Response, Request } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import logger from '../utils/logger';
import { config } from '../config';
import axios from 'axios';

const router = Router();
const prisma = new PrismaClient();

// List approvals for a run
router.get('/runs/:runId/approvals', authenticate, async (req: AuthRequest, res: Response) => {
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

    const approvals = await prisma.approval.findMany({
      where: { runId },
      include: {
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      approvals: approvals.map(a => ({
        id: a.id,
        runId: a.runId,
        stepId: a.stepId,
        requestedBy: a.requestedBy,
        approver: a.approver ? {
          id: a.approver.id,
          name: a.approver.name,
          email: a.approver.email,
        } : null,
        decision: a.decision,
        comment: a.comment,
        createdAt: a.createdAt,
        decidedAt: a.decidedAt,
      })),
    });
  } catch (error: any) {
    logger.error('Error listing approvals', error);
    res.status(500).json({ error: 'Failed to list approvals' });
  }
});

// Get approval by ID
router.get('/approvals/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId } = req;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const approval = await prisma.approval.findFirst({
      where: {
        id,
        run: {
          tenantId,
        },
      },
      include: {
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        run: {
          select: {
            id: true,
            status: true,
            pipeline: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!approval) {
      return res.status(404).json({ error: 'Approval not found' });
    }

    res.json({
      id: approval.id,
      runId: approval.runId,
      stepId: approval.stepId,
      requestedBy: approval.requestedBy,
      approver: approval.approver ? {
        id: approval.approver.id,
        name: approval.approver.name,
        email: approval.approver.email,
      } : null,
      decision: approval.decision,
      comment: approval.comment,
      createdAt: approval.createdAt,
      decidedAt: approval.decidedAt,
      run: approval.run,
    });
  } catch (error: any) {
    logger.error('Error getting approval', error);
    res.status(500).json({ error: 'Failed to get approval' });
  }
});

// Create approval request
router.post('/runs/:runId/approvals', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId, userId } = req;
    const { runId } = req.params;
    const { stepId, requestedBy } = req.body;

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

    const approval = await prisma.approval.create({
      data: {
        runId,
        stepId: stepId || null,
        requestedBy: requestedBy || userId || 'system',
      },
      include: {
        run: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    // Update run status to needs_approval if not already
    if (run.status !== 'needs_approval') {
      await prisma.run.update({
        where: { id: runId },
        data: { status: 'needs_approval' },
      });
    }

    logger.info(`Approval requested: ${approval.id}`, { tenantId, runId, stepId });

    res.status(201).json({
      id: approval.id,
      runId: approval.runId,
      stepId: approval.stepId,
      requestedBy: approval.requestedBy,
      decision: approval.decision,
      createdAt: approval.createdAt,
    });
  } catch (error: any) {
    logger.error('Error creating approval', error);
    res.status(500).json({ error: 'Failed to create approval' });
  }
});

// Approve or reject
router.patch('/approvals/:id/decision', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId, userId } = req;
    const { id } = req.params;
    const { decision, comment } = req.body;

    if (!tenantId || !userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!decision || !['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ error: 'Invalid decision. Must be "approved" or "rejected"' });
    }

    const approval = await prisma.approval.findFirst({
      where: {
        id,
        run: {
          tenantId,
        },
      },
      include: {
        run: {
          select: {
            id: true,
            status: true,
            pipelineId: true,
            inputs: true,
            pipeline: {
              select: {
                steps: true,
                policies: true,
              },
            },
          },
        },
      },
    });

    if (!approval) {
      return res.status(404).json({ error: 'Approval not found' });
    }

    if (approval.decision && approval.decision !== 'pending') {
      return res.status(400).json({ error: 'Approval already decided' });
    }

    // Update approval
    const updatedApproval = await prisma.approval.update({
      where: { id },
      data: {
        decision,
        comment: comment || null,
        approverId: userId,
        decidedAt: new Date(),
      },
      include: {
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // If approved, resume pipeline execution
    if (decision === 'approved') {
      // Update run status back to running
      await prisma.run.update({
        where: { id: approval.runId },
        data: { status: 'running' },
      });

      // Notify orchestrator to resume execution
      try {
        const run = approval.run;
        await axios.post(
          `${config.orchestrator.url}/api/v1/runs/${approval.runId}/resume`,
          {
            approvalId: id,
            decision,
            pipeline: {
              steps: JSON.parse(run.pipeline.steps),
              policies: run.pipeline.policies ? JSON.parse(run.pipeline.policies) : null,
            },
            inputs: JSON.parse(run.inputs),
          },
          {
            timeout: 5000,
          }
        );
      } catch (error: any) {
        logger.warn(`Failed to notify orchestrator: ${error.message}`);
      }
    } else {
      // If rejected, cancel the run
      await prisma.run.update({
        where: { id: approval.runId },
        data: { status: 'cancelled' },
      });
    }

    logger.info(`Approval ${decision}: ${id}`, { tenantId, runId: approval.runId, userId });

    res.json({
      id: updatedApproval.id,
      runId: updatedApproval.runId,
      decision: updatedApproval.decision,
      comment: updatedApproval.comment,
      approver: updatedApproval.approver,
      decidedAt: updatedApproval.decidedAt,
    });
  } catch (error: any) {
    logger.error('Error updating approval', error);
    res.status(500).json({ error: 'Failed to update approval' });
  }
});

export default router;
