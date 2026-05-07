ALTER TABLE "Resource" ADD COLUMN "isVisible" BOOLEAN NOT NULL DEFAULT true;

DROP INDEX IF EXISTS "Resource_status_publishedAt_idx";
CREATE INDEX "Resource_status_isVisible_publishedAt_idx" ON "Resource"("status", "isVisible", "publishedAt");
