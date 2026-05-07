import type { FastifyInstance } from "fastify";
import { ok } from "../utils/response.js";

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get("/health", async () => {
    return ok({
      status: "ok",
      service: "spire-card-api",
      time: new Date().toISOString()
    });
  });

  fastify.get("/api/v1/health", async () => {
    return ok({
      status: "ok",
      service: "spire-card-api",
      version: "v1",
      time: new Date().toISOString()
    });
  });

  fastify.get("/ready", async () => {
    await fastify.prisma.$queryRaw`SELECT 1`;
    return ok({
      status: "ready",
      service: "spire-card-api",
      time: new Date().toISOString()
    });
  });
}
