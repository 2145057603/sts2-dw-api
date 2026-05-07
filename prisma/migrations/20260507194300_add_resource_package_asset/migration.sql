ALTER TABLE "Resource" ADD COLUMN "packageAssetId" TEXT;

CREATE UNIQUE INDEX "Resource_packageAssetId_key" ON "Resource"("packageAssetId");

ALTER TABLE "Resource" ADD CONSTRAINT "Resource_packageAssetId_fkey" FOREIGN KEY ("packageAssetId") REFERENCES "UploadAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
