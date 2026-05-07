import { z } from "zod";

export const createUploadSchema = z.object({
  originalName: z.string().min(1).max(240),
  mimeType: z.string().min(1).max(120),
  sizeBytes: z.coerce.number().int().positive()
});

export const createSubmissionSchema = z.object({
  titleZh: z.string().min(1).max(120),
  titleEn: z.string().max(160).optional(),
  description: z.string().max(4000).optional(),
  version: z.string().max(60).optional(),
  assetIds: z.array(z.string()).default([])
});

export const updateSubmissionSchema = createSubmissionSchema.partial();
