-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."agent_memory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agent" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "outcome" TEXT,
    "embedding" vector(1536),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_memory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."club_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "url" TEXT NOT NULL,
    "source" TEXT,
    "instalacion" TEXT,
    "description" TEXT,
    "mood" TEXT,
    "time_of_day" TEXT,
    "people" BOOLEAN DEFAULT false,
    "score_reel" INTEGER,
    "score_foto" INTEGER,
    "score_stories" INTEGER,
    "best_format" TEXT,
    "content_angles" TEXT[],
    "used_count" INTEGER DEFAULT 0,
    "last_used" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."club_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "type" TEXT,
    "sport" TEXT,
    "recurrence" TEXT,
    "time_of_day" TEXT,
    "start_date" DATE,
    "end_date" DATE,
    "description" TEXT,
    "content_potential" INTEGER,
    "active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."conversations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lead_id" UUID,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."creatives" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" TEXT NOT NULL,
    "content" JSONB,
    "status" TEXT DEFAULT 'borrador',
    "meta_campaign_id" TEXT,
    "metrics" JSONB,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creatives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."leads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "status" TEXT DEFAULT 'nuevo',
    "score" INTEGER DEFAULT 0,
    "source" TEXT DEFAULT 'whatsapp',
    "last_contact" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."trends" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "topic" TEXT NOT NULL,
    "score" INTEGER DEFAULT 50,
    "angle" TEXT,
    "source" TEXT,
    "region" TEXT,
    "used" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trends_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversations_lead_id_created_at_idx" ON "public"."conversations"("lead_id" ASC, "created_at" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "leads_phone_key" ON "public"."leads"("phone" ASC);

-- AddForeignKey
ALTER TABLE "public"."conversations" ADD CONSTRAINT "conversations_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

