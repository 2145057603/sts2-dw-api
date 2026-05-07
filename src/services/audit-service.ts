import type { FastifyInstance } from "fastify";
import type { Prisma } from "@prisma/client";

export async function writeAudit(
  fastify: FastifyInstance,
  input: {
    actorId?: string;
    action: string;
    targetType: string;
    targetId?: string;
    metadata?: Prisma.InputJsonValue;
    ip?: string;
  }
) {
  await fastify.prisma.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: input.metadata,
      ip: input.ip
    }
  });
}
