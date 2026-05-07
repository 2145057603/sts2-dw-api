import type { FastifyInstance } from "fastify";
import { createUploadSchema } from "../../schemas/submissions.js";
import { createUploadTarget } from "../../services/storage-service.js";
import { validationError } from "../../utils/http-error.js";
import { ok } from "../../utils/response.js";

export async function uploadRoutes(fastify: FastifyInstance) {
  fastify.post("/uploads", { preHandler: fastify.requireAuth }, async (request) => {
    const parsed = createUploadSchema.safeParse(request.body);
    if (!parsed.success) throw validationError("上传参数无效");
    const target = await createUploadTarget({
      ownerId: request.authUser?.id,
      ...parsed.data
    });
    const asset = await fastify.prisma.uploadAsset.create({
      data: {
        ownerId: request.authUser?.id,
        driver: target.driver,
        objectKey: target.objectKey,
        originalName: parsed.data.originalName,
        mimeType: parsed.data.mimeType,
        sizeBytes: parsed.data.sizeBytes,
        publicUrl: target.publicUrl
      }
    });
    return ok({ asset, upload: target }, "上传记录已创建");
  });

  fastify.get("/uploads/:id", { preHandler: fastify.requireAuth }, async (request) => {
    const { id } = request.params as { id: string };
    const asset = await fastify.prisma.uploadAsset.findFirst({
      where: { id, ownerId: request.authUser?.id }
    });
    if (!asset) return ok(null, "上传记录不存在");
    return ok(asset);
  });
}
