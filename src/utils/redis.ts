import Redis from 'ioredis';
import { config } from '../config';
import logger from './logger';

export const redis = new Redis(config.redis.url, {
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
});

redis.on('error', (err) => {
  logger.error('Redis connection error', err);
});

redis.on('connect', () => {
  logger.info('Redis connected');
});

// Helper functions for queue management
export const queueKeys = {
  runQueue: 'queue:runs',
  runStatus: (runId: string) => `run:status:${runId}`,
  runProgress: (runId: string) => `run:progress:${runId}`,
};

export async function enqueueRun(runId: string, priority: number = 0) {
  await redis.zadd(queueKeys.runQueue, priority, runId);
}

export async function dequeueRun(): Promise<string | null> {
  const result = await redis.zpopmin(queueKeys.runQueue);
  return result && result.length > 0 ? result[0] : null;
}

export async function setRunStatus(runId: string, status: string, data?: any) {
  await redis.setex(
    queueKeys.runStatus(runId),
    3600, // 1 hour TTL
    JSON.stringify({ status, data, timestamp: Date.now() })
  );
}

export async function getRunStatus(runId: string): Promise<any> {
  const data = await redis.get(queueKeys.runStatus(runId));
  return data ? JSON.parse(data) : null;
}
