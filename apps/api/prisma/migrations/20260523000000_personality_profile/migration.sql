-- Create personality_profiles table (1:1 with sessions)
CREATE TABLE "personality_profiles" (
  "id"                  UUID        NOT NULL DEFAULT gen_random_uuid(),
  "session_id"          UUID        NOT NULL,

  -- 5-dimension scores (0–100), default 50 = neutral
  "novelty_drive"       DOUBLE PRECISION NOT NULL DEFAULT 50,
  "social_drive"        DOUBLE PRECISION NOT NULL DEFAULT 50,
  "status_drive"        DOUBLE PRECISION NOT NULL DEFAULT 50,
  "planning_style"      DOUBLE PRECISION NOT NULL DEFAULT 50,
  "sensory_mode"        DOUBLE PRECISION NOT NULL DEFAULT 50,

  -- Derived category labels
  "novelty_category"    VARCHAR(30) NOT NULL DEFAULT 'balanced',
  "social_category"     VARCHAR(30) NOT NULL DEFAULT 'balanced',
  "status_category"     VARCHAR(30) NOT NULL DEFAULT 'balanced',
  "planning_category"   VARCHAR(30) NOT NULL DEFAULT 'balanced',
  "sensory_category"    VARCHAR(30) NOT NULL DEFAULT 'balanced',

  -- Urge prediction
  "next_urge"           VARCHAR(50),
  "urge_confidence"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "predicted_triggers"  TEXT[]       NOT NULL DEFAULT '{}',

  -- Decision stage
  "decision_stage"      VARCHAR(20) NOT NULL DEFAULT 'dreaming',

  -- Timestamps
  "last_assessed_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "created_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "personality_profiles_pkey" PRIMARY KEY ("id")
);

-- Unique constraint enforces 1:1 with session
ALTER TABLE "personality_profiles"
  ADD CONSTRAINT "personality_profiles_session_id_key" UNIQUE ("session_id");

-- FK → sessions with cascade delete
ALTER TABLE "personality_profiles"
  ADD CONSTRAINT "personality_profiles_session_id_fkey"
  FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
