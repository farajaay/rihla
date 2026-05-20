-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "device_type" VARCHAR(50),
    "browser_language" VARCHAR(10),
    "timezone" VARCHAR(50),
    "referral_source" TEXT,
    "consent_given" BOOLEAN NOT NULL DEFAULT false,
    "ip_hash" VARCHAR(64),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "traveler_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "travel_archetype" VARCHAR(50),
    "decision_driver" VARCHAR(50),
    "group_type" VARCHAR(20),
    "group_size" INTEGER,
    "is_decision_maker" BOOLEAN,
    "budget_tier" VARCHAR(20),
    "budget_ceiling_sar" INTEGER,
    "comfort_threshold" VARCHAR(20),
    "risk_appetite" VARCHAR(10),
    "spontaneity_score" DOUBLE PRECISION,
    "value_definition" TEXT,
    "destinations_mentioned" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "activities_preferred" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "accommodation_pref" VARCHAR(30),
    "food_restrictions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "ad_segments" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "emotional_markers" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "date_signals" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "engagement_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "decision_readiness" VARCHAR(20),
    "profile_completeness" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "traveler_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "role" VARCHAR(10) NOT NULL,
    "content" TEXT NOT NULL,
    "profile_signals" JSONB,
    "token_count" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itineraries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "profile_id" UUID,
    "title" TEXT,
    "destination" TEXT,
    "duration_days" INTEGER,
    "budget_tier" VARCHAR(20),
    "total_sar_estimate" INTEGER,
    "itinerary_json" JSONB,
    "pdf_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "itineraries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_segments_export" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "segments" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "budget_tier" VARCHAR(20),
    "destinations" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "created_at" DATE NOT NULL DEFAULT CURRENT_DATE,

    CONSTRAINT "ad_segments_export_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "traveler_profiles_session_id_key" ON "traveler_profiles"("session_id");

-- CreateIndex
CREATE INDEX "conversations_session_id_created_at_idx" ON "conversations"("session_id", "created_at");

-- AddForeignKey
ALTER TABLE "traveler_profiles" ADD CONSTRAINT "traveler_profiles_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itineraries" ADD CONSTRAINT "itineraries_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itineraries" ADD CONSTRAINT "itineraries_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "traveler_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
