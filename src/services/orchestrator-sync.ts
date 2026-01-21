/**
 * Service to sync run updates from orchestrator (Redis) to database
 * This polls Redis for run status updates and updates the database
 */

import { PrismaClient } from '@prisma/client';
import { redis } from '../utils/redis';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export class OrchestratorSyncService {
  private intervalId: NodeJS.Timeout | null = null;
  private running = false;

  /**
   * Start polling Redis for run updates
   */
  start(intervalMs: number = 2000) {
    if (this.running) {
      logger.warn('Orchestrator sync service already running');
      return;
    }

    this.running = true;
    logger.info('Starting orchestrator sync service', { intervalMs });

    this.intervalId = setInterval(async () => {
      try {
        await this.syncRunUpdates();
      } catch (error) {
        logger.error('Error syncing run updates', error);
      }
    }, intervalMs);
  }

  /**
   * Stop polling
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.running = false;
    logger.info('Orchestrator sync service stopped');
  }

  /**
   * Sync run updates from Redis to database
   */
  private async syncRunUpdates() {
    // Find all run update keys in Redis
    const keys = await redis.keys('run:update:*');
    
    for (const key of keys) {
      try {
        const runId = key.replace('run:update:', '');
        const dataStr = await redis.get(key);
        
        if (!dataStr) continue;

        const data = JSON.parse(dataStr);
        const { status, ...updateData } = data;

        // Update run in database
        await prisma.run.update({
          where: { id: runId },
          data: {
            status,
            ...(updateData.outputs && { outputs: JSON.stringify(updateData.outputs) }),
            ...(updateData.cost !== undefined && { cost: updateData.cost }),
            ...(updateData.tokensUsed !== undefined && { tokensUsed: updateData.tokensUsed }),
            ...(updateData.latencyMs !== undefined && { latencyMs: updateData.latencyMs }),
            ...(updateData.errorMessage && { errorMessage: updateData.errorMessage }),
            ...(updateData.startedAt && { startedAt: new Date(updateData.startedAt) }),
            ...(updateData.finishedAt && { finishedAt: new Date(updateData.finishedAt) }),
          },
        });

        // Delete the update key after processing (if status is terminal)
        if (['completed', 'failed', 'cancelled'].includes(status)) {
          await redis.del(key);
        }

        logger.debug(`Synced run update: ${runId}`, { status });
      } catch (error) {
        logger.error(`Error processing run update: ${key}`, error);
      }
    }

    // Sync step run updates
    const stepKeys = await redis.keys('step_run:*');
    for (const key of stepKeys) {
      try {
        const stepRunId = key.replace('step_run:', '');
        const [runId, , stepId] = stepRunId.split(':');
        
        const dataStr = await redis.get(key);
        if (!dataStr) continue;

        const data = JSON.parse(dataStr);

        // Update step run in database
        await prisma.stepRun.updateMany({
          where: {
            runId,
            stepId,
          },
          data: {
            status: data.status,
            ...(data.outputs && { outputs: data.outputs }),
            ...(data.cost !== undefined && { cost: data.cost }),
            ...(data.tokensUsed !== undefined && { tokensUsed: data.tokensUsed }),
            ...(data.latencyMs !== undefined && { latencyMs: data.latencyMs }),
            ...(data.errorMessage && { errorMessage: data.errorMessage }),
            ...(data.startedAt && { startedAt: new Date(data.startedAt) }),
            ...(data.finishedAt && { finishedAt: new Date(data.finishedAt) }),
          },
        });

        // Delete the update key after processing (if status is terminal)
        if (['completed', 'failed'].includes(data.status)) {
          await redis.del(key);
        }
      } catch (error) {
        logger.error(`Error processing step run update: ${key}`, error);
      }
    }
  }
}

// Singleton instance
export const orchestratorSync = new OrchestratorSyncService();
