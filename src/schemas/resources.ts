import { z } from "zod";

export const resourceListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  q: z.string().optional(),
  role: z.string().optional(),
  tags: z.string().optional(),
  sort: z.enum(["hot", "updated", "downloads"]).default("hot"),
  locale: z.enum(["zh", "en"]).default("zh")
});
