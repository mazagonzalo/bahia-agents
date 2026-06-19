-- CreateEnum
CREATE TYPE "AgentType" AS ENUM ('TENDENCIAS', 'CONTENIDO', 'EVENTOS', 'META_ADS', 'VENTAS', 'SEGUIMIENTO', 'CRITICO', 'REPUTACION', 'SECRETARIA', 'META');

-- CreateEnum
CREATE TYPE "AgentContextKind" AS ENUM ('LEARNING', 'FACT', 'FAILURE', 'PATTERN');

-- CreateEnum
CREATE TYPE "AgentContextScope" AS ENUM ('GLOBAL', 'AGENT', 'TASK');

-- CreateEnum
CREATE TYPE "AgentRunStatus" AS ENUM ('SUCCESS', 'FAILED', 'ABSTAINED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXECUTED');

-- CreateTable
CREATE TABLE "AgentApproval" (
    "id" TEXT NOT NULL,
    "agentType" "AgentType" NOT NULL,
    "proposalData" JSONB NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "proposedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "coordinatedWith" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "executedAt" TIMESTAMP(3),
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentProposalHistory" (
    "id" TEXT NOT NULL,
    "approvalId" TEXT NOT NULL,
    "agentType" "AgentType" NOT NULL,
    "proposalSummary" TEXT NOT NULL,
    "executionStatus" TEXT NOT NULL,
    "metrics" JSONB NOT NULL,
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentProposalHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentContext" (
    "id" TEXT NOT NULL,
    "agentType" "AgentType" NOT NULL,
    "kind" "AgentContextKind" NOT NULL,
    "scope" "AgentContextScope" NOT NULL DEFAULT 'AGENT',
    "content" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "embedding" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "useCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AgentContext_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentPromptVersion" (
    "id" TEXT NOT NULL,
    "agentType" "AgentType" NOT NULL,
    "version" INTEGER NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "toolsConfig" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvalId" TEXT,

    CONSTRAINT "AgentPromptVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentRunLog" (
    "id" TEXT NOT NULL,
    "agentType" "AgentType" NOT NULL,
    "approvalId" TEXT,
    "promptVersionId" TEXT,
    "status" "AgentRunStatus" NOT NULL,
    "errorMsg" TEXT,
    "latencyMs" INTEGER NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "contextIdsUsed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentRunLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "actorId" TEXT,
    "changes" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentApproval_agentType_status_idx" ON "AgentApproval"("agentType", "status");

-- CreateIndex
CREATE INDEX "AgentApproval_createdAt_idx" ON "AgentApproval"("createdAt");

-- CreateIndex
CREATE INDEX "AgentProposalHistory_agentType_idx" ON "AgentProposalHistory"("agentType");

-- CreateIndex
CREATE INDEX "AgentProposalHistory_createdAt_idx" ON "AgentProposalHistory"("createdAt");

-- CreateIndex
CREATE INDEX "AgentContext_agentType_scope_idx" ON "AgentContext"("agentType", "scope");

-- CreateIndex
CREATE INDEX "AgentContext_lastUsedAt_idx" ON "AgentContext"("lastUsedAt");

-- CreateIndex
CREATE INDEX "AgentContext_tags_idx" ON "AgentContext"("tags");

-- CreateIndex
CREATE INDEX "AgentPromptVersion_agentType_isActive_idx" ON "AgentPromptVersion"("agentType", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AgentPromptVersion_agentType_version_key" ON "AgentPromptVersion"("agentType", "version");

-- CreateIndex
CREATE INDEX "AgentRunLog_agentType_createdAt_idx" ON "AgentRunLog"("agentType", "createdAt");

-- CreateIndex
CREATE INDEX "AgentRunLog_status_idx" ON "AgentRunLog"("status");

-- CreateIndex
CREATE INDEX "AgentRunLog_approvalId_idx" ON "AgentRunLog"("approvalId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");


-- Seguridad: RLS deny-by-default en las tablas de gobierno (sin política →
-- solo el owner/service bypassa; cierra el acceso anónimo vía PostgREST).
ALTER TABLE "AgentApproval" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentProposalHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentContext" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentPromptVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentRunLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
