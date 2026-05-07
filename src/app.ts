import crypto from "node:crypto";
import Fastify from "fastify";
import { errorsPlugin } from "./plugins/errors.js";
import { authPlugin } from "./plugins/auth.js";
import { prismaPlugin } from "./plugins/prisma.js";
import { securityPlugin } from "./plugins/security.js";
import { docsRoutes } from "./routes/docs.js";
import { healthRoutes } from "./routes/health.js";
import { compatRoutes } from "./routes/compat.js";
import { v1Routes } from "./routes/v1/index.js";

export async function buildApp(options: { skipPrisma?: boolean } = {}) {
  const fastify = Fastify({
    genReqId: () => crypto.randomUUID(),
    logger: {
      level: process.env.NODE_ENV === "production" ? "info" : "debug"
    }
  });

  await fastify.register(errorsPlugin);
  await fastify.register(securityPlugin);
  await fastify.register(authPlugin);
  if (!options.skipPrisma) {
    await fastify.register(prismaPlugin);
  }
  await fastify.register(docsRoutes);
  await fastify.register(healthRoutes);
  await fastify.register(compatRoutes);
  await fastify.register(v1Routes);

  return fastify;
}
