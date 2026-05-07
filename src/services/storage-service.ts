import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { env } from "../config/env.js";
import { randomToken } from "../utils/tokens.js";

export type CreateUploadInput = {
  ownerId?: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
};

export async function createUploadTarget(input: CreateUploadInput) {
  const objectKey = `${new Date().toISOString().slice(0, 10)}/${randomToken(16)}-${input.originalName}`;
  if (env.UPLOAD_DRIVER === "local") {
    await mkdir(join(process.cwd(), env.UPLOAD_DIR, objectKey.split("/")[0]), { recursive: true });
    await writeFile(join(process.cwd(), env.UPLOAD_DIR, objectKey), "");
  }
  return {
    driver: env.UPLOAD_DRIVER,
    objectKey,
    uploadUrl: env.UPLOAD_DRIVER === "local" ? `${env.PUBLIC_BASE_URL}/uploads/${objectKey}` : null,
    publicUrl: env.UPLOAD_DRIVER === "local" ? `${env.PUBLIC_BASE_URL}/uploads/${objectKey}` : null
  };
}
