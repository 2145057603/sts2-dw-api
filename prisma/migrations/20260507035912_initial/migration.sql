-- Initial PostgreSQL schema for spire-card-api.
-- Generated from prisma/schema.prisma and committed for deploy-time migration discipline.

CREATE TYPE "UserStatus" AS ENUM ('active', 'disabled', 'banned');
CREATE TYPE "UserRole" AS ENUM ('user', 'author', 'admin');
CREATE TYPE "ResourceStatus" AS ENUM ('draft', 'pending', 'published', 'archived', 'rejected');
CREATE TYPE "SubmissionStatus" AS ENUM ('draft', 'pending', 'approved', 'rejected', 'withdrawn');
CREATE TYPE "UploadDriver" AS ENUM ('local', 'cos', 's3');
CREATE TYPE "UploadStatus" AS ENUM ('pending', 'uploaded', 'attached', 'deleted');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'user',
  "status" "UserStatus" NOT NULL DEFAULT 'active',
  "avatarUrl" TEXT,
  "bio" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "refreshHash" TEXT NOT NULL,
  "userAgent" TEXT,
  "ip" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VerificationCode" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "consumedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "userId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VerificationCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RoleOption" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "labelZh" TEXT NOT NULL,
  "labelEn" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RoleOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Resource" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "titleZh" TEXT NOT NULL,
  "titleEn" TEXT,
  "descriptionZh" TEXT,
  "descriptionEn" TEXT,
  "authorId" TEXT,
  "authorName" TEXT NOT NULL,
  "roleId" TEXT,
  "rarity" TEXT,
  "version" TEXT NOT NULL,
  "gameVersion" TEXT,
  "sizeBytes" BIGINT,
  "status" "ResourceStatus" NOT NULL DEFAULT 'draft',
  "downloads" INTEGER NOT NULL DEFAULT 0,
  "hotScore" INTEGER NOT NULL DEFAULT 0,
  "tone" TEXT,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Tag" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "labelZh" TEXT NOT NULL,
  "labelEn" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ResourceTag" (
  "resourceId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  CONSTRAINT "ResourceTag_pkey" PRIMARY KEY ("resourceId","tagId")
);

CREATE TABLE "Submission" (
  "id" TEXT NOT NULL,
  "submitterId" TEXT NOT NULL,
  "resourceId" TEXT,
  "titleZh" TEXT NOT NULL,
  "titleEn" TEXT,
  "description" TEXT,
  "version" TEXT,
  "status" "SubmissionStatus" NOT NULL DEFAULT 'draft',
  "reviewReason" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UploadAsset" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT,
  "resourceId" TEXT,
  "submissionId" TEXT,
  "driver" "UploadDriver" NOT NULL DEFAULT 'local',
  "status" "UploadStatus" NOT NULL DEFAULT 'pending',
  "bucket" TEXT,
  "objectKey" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" BIGINT NOT NULL,
  "publicUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UploadAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Favorite" (
  "userId" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Favorite_pkey" PRIMARY KEY ("userId","resourceId")
);

CREATE TABLE "DownloadEvent" (
  "id" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "userId" TEXT,
  "ipHash" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DownloadEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT,
  "metadata" JSONB,
  "ip" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Session_refreshHash_key" ON "Session"("refreshHash");
CREATE UNIQUE INDEX "RoleOption_key_key" ON "RoleOption"("key");
CREATE UNIQUE INDEX "Resource_slug_key" ON "Resource"("slug");
CREATE UNIQUE INDEX "Tag_key_key" ON "Tag"("key");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE INDEX "VerificationCode_email_purpose_idx" ON "VerificationCode"("email", "purpose");
CREATE INDEX "VerificationCode_expiresAt_idx" ON "VerificationCode"("expiresAt");
CREATE INDEX "Resource_status_publishedAt_idx" ON "Resource"("status", "publishedAt");
CREATE INDEX "Resource_roleId_idx" ON "Resource"("roleId");
CREATE INDEX "Resource_hotScore_idx" ON "Resource"("hotScore");
CREATE INDEX "Submission_submitterId_idx" ON "Submission"("submitterId");
CREATE INDEX "Submission_status_idx" ON "Submission"("status");
CREATE INDEX "UploadAsset_ownerId_idx" ON "UploadAsset"("ownerId");
CREATE INDEX "UploadAsset_resourceId_idx" ON "UploadAsset"("resourceId");
CREATE INDEX "UploadAsset_submissionId_idx" ON "UploadAsset"("submissionId");
CREATE INDEX "DownloadEvent_resourceId_createdAt_idx" ON "DownloadEvent"("resourceId", "createdAt");
CREATE INDEX "DownloadEvent_userId_idx" ON "DownloadEvent"("userId");
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VerificationCode" ADD CONSTRAINT "VerificationCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "RoleOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ResourceTag" ADD CONSTRAINT "ResourceTag_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResourceTag" ADD CONSTRAINT "ResourceTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_submitterId_fkey" FOREIGN KEY ("submitterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UploadAsset" ADD CONSTRAINT "UploadAsset_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UploadAsset" ADD CONSTRAINT "UploadAsset_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UploadAsset" ADD CONSTRAINT "UploadAsset_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DownloadEvent" ADD CONSTRAINT "DownloadEvent_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DownloadEvent" ADD CONSTRAINT "DownloadEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
