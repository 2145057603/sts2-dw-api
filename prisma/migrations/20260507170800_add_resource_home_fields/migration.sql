ALTER TABLE "Resource" ADD COLUMN "showOnHome" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Resource" ADD COLUMN "homeSortOrder" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "Resource_showOnHome_homeSortOrder_idx" ON "Resource"("showOnHome", "homeSortOrder");
