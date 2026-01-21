import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config';
import logger from './utils/logger';
import { orchestratorSync } from './services/orchestrator-sync';

// Routes
import pipelinesRouter from './routes/pipelines';
import runsRouter from './routes/runs';
import authRouter from './routes/auth';
import artifactsRouter from './routes/artifacts';
import approvalsRouter from './routes/approvals';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'aic-api' });
});

// Root route (handy for quick browser checks)
app.get('/', (req, res) => {
  res.json({
    service: 'aic-api',
    status: 'ok',
    health: '/health',
    apiBase: '/api/v1',
  });
});

// Import step runs router
import stepRunsRouter from './routes/runs-steps';

// API routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/pipelines', pipelinesRouter);
app.use('/api/v1/runs', runsRouter);
app.use('/api/v1/runs', stepRunsRouter);
app.use('/api/v1', artifactsRouter);
app.use('/api/v1', approvalsRouter);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  logger.info(`AIC API Server running on port ${PORT}`, {
    nodeEnv: config.nodeEnv,
    port: PORT,
  });
  
  // Start orchestrator sync service
  orchestratorSync.start(2000); // Sync every 2 seconds
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  orchestratorSync.stop();
  process.exit(0);
});
