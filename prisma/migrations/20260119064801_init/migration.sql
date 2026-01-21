/*
  Warnings:

  - The `scopes` column on the `api_keys` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `metadata` column on the `artifacts` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `policies` column on the `pipelines` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `outputs` column on the `runs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `outputs` column on the `step_runs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `quotas` column on the `tenants` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `roles` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `permissions` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `config` on the `integrations` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `inputSchema` on the `pipelines` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `outputSchema` on the `pipelines` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `steps` on the `pipelines` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `inputs` on the `runs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `inputs` on the `step_runs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropIndex
DROP INDEX "approvals_runId_decision_idx";

-- DropIndex
DROP INDEX "artifacts_runId_type_idx";

-- DropIndex
DROP INDEX "runs_createdAt_idx";

-- DropIndex
DROP INDEX "runs_pipelineId_status_idx";

-- DropIndex
DROP INDEX "step_runs_runId_orderIndex_idx";

-- AlterTable
ALTER TABLE "api_keys" DROP COLUMN "scopes",
ADD COLUMN     "scopes" JSONB;

-- AlterTable
ALTER TABLE "artifacts" DROP COLUMN "metadata",
ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "integrations" DROP COLUMN "config",
ADD COLUMN     "config" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "pipelines" DROP COLUMN "inputSchema",
ADD COLUMN     "inputSchema" JSONB NOT NULL,
DROP COLUMN "outputSchema",
ADD COLUMN     "outputSchema" JSONB NOT NULL,
DROP COLUMN "steps",
ADD COLUMN     "steps" JSONB NOT NULL,
DROP COLUMN "policies",
ADD COLUMN     "policies" JSONB;

-- AlterTable
ALTER TABLE "runs" DROP COLUMN "inputs",
ADD COLUMN     "inputs" JSONB NOT NULL,
DROP COLUMN "outputs",
ADD COLUMN     "outputs" JSONB;

-- AlterTable
ALTER TABLE "step_runs" DROP COLUMN "inputs",
ADD COLUMN     "inputs" JSONB NOT NULL,
DROP COLUMN "outputs",
ADD COLUMN     "outputs" JSONB;

-- AlterTable
ALTER TABLE "tenants" DROP COLUMN "quotas",
ADD COLUMN     "quotas" JSONB;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "roles",
ADD COLUMN     "roles" JSONB NOT NULL DEFAULT '[]',
DROP COLUMN "permissions",
ADD COLUMN     "permissions" JSONB;
