/*
  Warnings:

  - You are about to drop the column `remediationWebhookSecret` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `remediationWebhookUrl` on the `Project` table. All the data in the column will be lost.
  - Made the column `deploymentProvider` on table `Project` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
ALTER TYPE "DeploymentProvider" ADD VALUE 'NONE';

-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "serviceName" TEXT NOT NULL DEFAULT 'default',
ADD COLUMN     "stackTrace" TEXT;

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "remediationWebhookSecret",
DROP COLUMN "remediationWebhookUrl",
ADD COLUMN     "customWebhookUrl" TEXT,
ADD COLUMN     "platformTeamId" TEXT,
ALTER COLUMN "deploymentProvider" SET NOT NULL,
ALTER COLUMN "deploymentProvider" SET DEFAULT 'NONE';
