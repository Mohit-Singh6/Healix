/*
  Warnings:

  - Added the required column `updatedAt` to the `PostMortem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Project` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DeploymentProvider" AS ENUM ('VERCEL', 'RENDER', 'CUSTOM');

-- CreateEnum
CREATE TYPE "HumanApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "actionPayload" JSONB,
ADD COLUMN     "decidedAt" TIMESTAMP(3),
ADD COLUMN     "humanApprovalStatus" "HumanApprovalStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "operatorFeedback" TEXT,
ADD COLUMN     "remediationPrUrl" TEXT,
ADD COLUMN     "reviewedBy" TEXT;

-- AlterTable
ALTER TABLE "PostMortem" ADD COLUMN     "title" TEXT NOT NULL DEFAULT 'Incident Post-Mortem Report',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "defaultBranch" TEXT NOT NULL DEFAULT 'main',
ADD COLUMN     "deploymentProvider" "DeploymentProvider",
ADD COLUMN     "githubInstallationId" TEXT,
ADD COLUMN     "githubToken" TEXT,
ADD COLUMN     "platformApiToken" TEXT,
ADD COLUMN     "platformServiceId" TEXT,
ADD COLUMN     "remediationWebhookSecret" TEXT,
ADD COLUMN     "remediationWebhookUrl" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
