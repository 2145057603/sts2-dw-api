import type { FastifyInstance } from "fastify";
import { resourceListQuerySchema } from "../../schemas/resources.js";
import {
  getResource,
  getResourceMeta,
  getResourceStats,
  listHomeResources,
  listResources,
  recordDownload
} from "../../services/resource-service.js";
import { validationError } from "../../utils/http-error.js";
import { ok } from "../../utils/response.js";

export async function resourceRoutes(fastify: FastifyInstance) {
  fastify.get("/resources", async (request) => {
    const parsed = resourceListQuerySchema.safeParse(request.query);
    if (!parsed.success) throw validationError("资源查询参数无效");
    return ok(await listResources(fastify, parsed.data));
  });

  fastify.get("/resources/meta", async () => ok(await getResourceMeta(fastify)));

  fastify.get("/resources/stats", async () => ok(await getResourceStats(fastify)));

  fastify.get("/resources/home", async () => ok(await listHomeResources(fastify)));

  fastify.get("/resources/:id", async (request) => {
    const { id } = request.params as { id: string };
    return ok(await getResource(fastify, id));
  });

  fastify.post("/resources/:id/download", async (request) => {
    const { id } = request.params as { id: string };
    return ok(await recordDownload(fastify, id, request.headers["user-agent"], request.ip));
  });
}
