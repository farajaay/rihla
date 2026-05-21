-- Add itinerary revision chain (parentId + revision + refinement_request)
ALTER TABLE "itineraries"
  ADD COLUMN "parent_id" UUID,
  ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "refinement_request" TEXT;

-- Self-referencing FK; SetNull on delete so deleting a parent doesn't cascade-kill children
ALTER TABLE "itineraries"
  ADD CONSTRAINT "itineraries_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "itineraries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Index on (session_id, created_at) for ordered revision lookups
CREATE INDEX "itineraries_session_id_created_at_idx" ON "itineraries"("session_id", "created_at");
