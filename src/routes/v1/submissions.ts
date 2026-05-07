import type { FastifyInstance } from "fastify";
import { createSubmissionSchema, updateSubmissionSchema } from "../../schemas/submissions.js";
import { HttpError, validationError } from "../../utils/http-error.js";
import { ok } from "../../utils/response.js";

export async function submissionRoutes(fastify: FastifyInstance) {
  fastify.get("/submissions/me", { preHandler: fastify.requireAuth }, async (request) => {
    const items = await fastify.prisma.submission.findMany({
      where: { submitterId: request.authUser?.id },
      orderBy: { updatedAt: "desc" },
      include: { assets: true }
    });
    return ok(items);
  });

  fastify.post("/submissions", { preHandler: fastify.requireAuth }, async (request) => {
    const parsed = createSubmissionSchema.safeParse(request.body);
    if (!parsed.success) throw validationError("投稿内容无效");
    const { assetIds, ...data } = parsed.data;
    const submission = await fastify.prisma.submission.create({
      data: {
        ...data,
        submitterId: request.authUser?.id ?? "",
        assets: { connect: assetIds.map((id) => ({ id })) }
      },
      include: { assets: true }
    });
    return ok(submission, "投稿草稿已创建");
  });

  fastify.patch("/submissions/:id", { preHandler: fastify.requireAuth }, async (request) => {
    const { id } = request.params as { id: string };
    const parsed = updateSubmissionSchema.safeParse(request.body);
    if (!parsed.success) throw validationError("投稿内容无效");
    const current = await fastify.prisma.submission.findFirst({ where: { id, submitterId: request.authUser?.id } });
    if (!current) throw new HttpError(404, "NOT_FOUND", "投稿不存在");
    if (!["draft", "rejected"].includes(current.status)) throw new HttpError(409, "CONFLICT", "当前状态不可编辑");
    const { assetIds, ...data } = parsed.data;
    const submission = await fastify.prisma.submission.update({
      where: { id },
      data: {
        ...data,
        ...(assetIds ? { assets: { set: assetIds.map((assetId) => ({ id: assetId })) } } : {})
      },
      include: { assets: true }
    });
    return ok(submission, "投稿已更新");
  });

  fastify.post("/submissions/:id/submit", { preHandler: fastify.requireAuth }, async (request) => {
    const { id } = request.params as { id: string };
    const current = await fastify.prisma.submission.findFirst({ where: { id, submitterId: request.authUser?.id } });
    if (!current) throw new HttpError(404, "NOT_FOUND", "投稿不存在");
    const submission = await fastify.prisma.submission.update({ where: { id }, data: { status: "pending" } });
    return ok(submission, "投稿已提交审核");
  });

  fastify.post("/submissions/:id/withdraw", { preHandler: fastify.requireAuth }, async (request) => {
    const { id } = request.params as { id: string };
    const current = await fastify.prisma.submission.findFirst({ where: { id, submitterId: request.authUser?.id } });
    if (!current) throw new HttpError(404, "NOT_FOUND", "投稿不存在");
    const submission = await fastify.prisma.submission.update({ where: { id }, data: { status: "withdrawn" } });
    return ok(submission, "投稿已撤回");
  });
}
