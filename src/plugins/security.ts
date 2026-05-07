import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import fp from "fastify-plugin";
import { corsOrigins, env } from "../config/env.js";

export const securityPlugin = fp(async (fastify) => {
  await fastify.register(helmet);
  await fastify.register(cors, {
    origin: corsOrigins,
    credentials: true
  });
  await fastify.register(jwt, {
    secret: env.JWT_ACCESS_SECRET
  });
  await fastify.register(rateLimit, {
    max: 120,
    timeWindow: "1 minute"
  });
});
