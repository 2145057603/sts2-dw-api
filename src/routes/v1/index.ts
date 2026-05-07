import type { FastifyInstance } from "fastify";
import { authRoutes } from "./auth.js";
import { adminRoutes } from "./admin.js";
import { resourceRoutes } from "./resources.js";
import { submissionRoutes } from "./submissions.js";
import { uploadRoutes } from "./uploads.js";

export async function v1Routes(fastify: FastifyInstance) {
  await fastify.register(authRoutes, { prefix: "/api/v1" });
  await fastify.register(adminRoutes, { prefix: "/api/v1" });
  await fastify.register(resourceRoutes, { prefix: "/api/v1" });
  await fastify.register(uploadRoutes, { prefix: "/api/v1" });
  await fastify.register(submissionRoutes, { prefix: "/api/v1" });
}
