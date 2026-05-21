-- Add advertising attribution columns to sessions
ALTER TABLE "sessions"
  ADD COLUMN "idfa_raw"     VARCHAR(64),
  ADD COLUMN "gaid_raw"     VARCHAR(64),
  ADD COLUMN "fbclid"       VARCHAR(250),
  ADD COLUMN "gclid"        VARCHAR(250),
  ADD COLUMN "ttclid"       VARCHAR(250),
  ADD COLUMN "snapclid"     VARCHAR(250),
  ADD COLUMN "utm_source"   VARCHAR(100),
  ADD COLUMN "utm_medium"   VARCHAR(100),
  ADD COLUMN "utm_campaign" VARCHAR(200),
  ADD COLUMN "utm_content"  VARCHAR(200),
  ADD COLUMN "utm_term"     VARCHAR(200);

-- Index for ad platform lookups by IDFA / GAID
CREATE INDEX "sessions_idfa_raw_idx" ON "sessions"("idfa_raw") WHERE "idfa_raw" IS NOT NULL;
CREATE INDEX "sessions_gaid_raw_idx" ON "sessions"("gaid_raw") WHERE "gaid_raw" IS NOT NULL;
