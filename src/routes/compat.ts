import type { FastifyInstance } from "fastify";
import { authRoutes } from "./v1/auth.js";

export async function compatRoutes(fastify: FastifyInstance) {
  await fastify.register(authRoutes, { prefix: "/api" });
}
