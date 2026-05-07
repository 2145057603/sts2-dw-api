import fp from "fastify-plugin";
import type { UserRole } from "@prisma/client";
import { HttpError } from "../utils/http-error.js";

const isAdminRole = (role?: UserRole) => role === "admin" || role === "superadmin";

declare module "fastify" {
  interface FastifyRequest {
    authUser?: {
      id: string;
      role: UserRole;
    };
  }

  interface FastifyInstance {
    requireAuth: (request: FastifyRequest) => Promise<void>;
    requireAdmin: (request: FastifyRequest) => Promise<void>;
  }
}

export const authPlugin = fp(async (fastify) => {
  fastify.decorate("requireAuth", async (request) => {
    const payload = await request.jwtVerify<{ sub: string; role: UserRole }>();
    request.authUser = { id: payload.sub, role: payload.role };
  });

  fastify.decorate("requireAdmin", async (request) => {
    await fastify.requireAuth(request);
    if (!isAdminRole(request.authUser?.role)) {
      throw new HttpError(403, "FORBIDDEN", "Admin permission required");
    }
  });
});
