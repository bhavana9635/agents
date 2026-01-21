import { z } from 'zod';

// Pipeline Types
export const PipelineStepSchema = z.object({
  id: z.string(),
  type: z.enum(['agent', 'tool', 'approval', 'condition']),
  config: z.record(z.any()).optional(),
});

export const PipelineDAGSchema = z.object({
  nodes: z.array(PipelineStepSchema),
  edges: z.array(z.object({
    from: z.string(),
    to: z.string(),
    condition: z.string().optional(),
  })),
});

export const PipelinePolicySchema = z.object({
  allowedTools: z.array(z.string()).optional(),
  maxBudget: z.number().optional(),
  dataScopes: z.array(z.string()).optional(),
  redactionRules: z.array(z.string()).optional(),
  rateLimits: z.record(z.number()).optional(),
});

export const PipelineSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  inputSchema: z.record(z.any()),
  outputSchema: z.record(z.any()),
  steps: PipelineDAGSchema,
  policies: PipelinePolicySchema.optional(),
});

export type PipelineStep = z.infer<typeof PipelineStepSchema>;
export type PipelineDAG = z.infer<typeof PipelineDAGSchema>;
export type PipelinePolicy = z.infer<typeof PipelinePolicySchema>;
export type Pipeline = z.infer<typeof PipelineSchema>;

// Run Types
export type RunStatus = 'queued' | 'running' | 'needs_approval' | 'completed' | 'failed' | 'cancelled';
export type StepRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

// API Types
export interface CreateRunRequest {
  pipelineId: string;
  inputs: Record<string, any>;
}

export interface CreateApiKeyRequest {
  name: string;
  scopes?: string[];
  expiresInDays?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Orchestrator API Types
export interface OrchestratorRunRequest {
  runId: string;
  pipelineId: string;
  inputs: Record<string, any>;
  pipeline: {
    steps: PipelineDAG;
    policies?: PipelinePolicy;
  };
}

export interface OrchestratorRunResponse {
  status: RunStatus;
  outputs?: Record<string, any>;
  error?: string;
}
