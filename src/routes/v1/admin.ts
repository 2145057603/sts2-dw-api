import type { FastifyInstance } from "fastify";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { writeAudit } from "../../services/audit-service.js";
import { HttpError, validationError } from "../../utils/http-error.js";
import { ok } from "../../utils/response.js";

const rejectSchema = z.object({ reason: z.string().min(1).max(1000) });
const tagSchema = z.object({ key: z.string().min(1).max(60), labelZh: z.string().min(1), labelEn: z.string().optional() });
const roleSchema = tagSchema.extend({ sortOrder: z.coerce.number().int().default(0) });
const tagUpdateSchema = tagSchema.partial().refine((value) => Object.keys(value).length > 0, "At least one field is required");
const roleUpdateSchema = roleSchema.partial().refine((value) => Object.keys(value).length > 0, "At least one field is required");
const userListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(20),
  keyword: z.string().trim().max(100).optional().default(""),
  role: z.enum(["all", "user", "author", "admin", "superadmin"]).default("all"),
  status: z.enum(["all", "active", "disabled", "banned"]).default("all")
});
const userUpdateSchema = z.object({
  role: z.enum(["user", "author", "admin", "superadmin"]).optional(),
  status: z.enum(["active", "disabled", "banned"]).optional()
});
const showcaseImagesSchema = z.array(z.object({
  url: z.string().trim().max(1000),
  cropY: z.coerce.number().int().min(0).max(100).default(50)
}));
const packageAssetSchema = z.object({
  originalName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(120).default("application/octet-stream"),
  sizeBytes: z.coerce.bigint().min(0n),
  publicUrl: z.string().trim().max(1000).nullable().optional()
});
const resourceBaseSchema = z.object({
  titleZh: z.string().trim().min(1).max(200).optional(),
  titleEn: z.string().trim().max(200).nullable().optional(),
  authorName: z.string().trim().min(1).max(100).optional(),
  roleKey: z.string().trim().max(60).nullable().optional(),
  badge: z.string().trim().max(40).nullable().optional(),
  coverImageUrl: z.string().trim().max(1000).nullable().optional(),
  coverCropY: z.coerce.number().int().min(0).max(100).optional(),
  showcaseImageUrl: z.string().trim().max(1000).nullable().optional(),
  showcaseImages: showcaseImagesSchema.optional(),
  originalPostUrl: z.string().trim().max(1000).nullable().optional(),
  descriptionZh: z.string().trim().max(3000).nullable().optional(),
  descriptionEn: z.string().trim().max(3000).nullable().optional(),
  version: z.string().trim().min(1).max(60).optional(),
  gameVersion: z.string().trim().max(80).nullable().optional(),
  cardCount: z.coerce.number().int().min(0).max(99999).optional(),
  sizeBytes: z.coerce.bigint().min(0n).nullable().optional(),
  packageAssetId: z.string().trim().nullable().optional(),
  tagKeys: z.array(z.string().trim().min(1).max(60)).optional(),
  status: z.enum(["draft", "pending", "published", "archived", "rejected"]).optional(),
  isVisible: z.boolean().optional(),
  hotScore: z.coerce.number().int().min(0).optional(),
  showOnHome: z.boolean().optional(),
  homeSortOrder: z.coerce.number().int().min(0).optional()
});
const resourceUpdateSchema = resourceBaseSchema;
const resourceCreateSchema = resourceBaseSchema.extend({
  titleZh: z.string().trim().min(1).max(200),
  authorName: z.string().trim().min(1).max(100),
  version: z.string().trim().min(1).max(60)
});
const jsonSafe = <T>(value: T): T =>
  JSON.parse(JSON.stringify(value, (_key, item) => (typeof item === "bigint" ? item.toString() : item)));
const adminRoles = ["admin", "superadmin"] as const;
const isAdminRole = (role?: string | null) => role === "admin" || role === "superadmin";
const slugify = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `resource-${Date.now()}`;

async function createUniqueResourceSlug(prisma: FastifyInstance["prisma"], title: string) {
  const baseSlug = slugify(title);
  let slug = baseSlug;
  let index = 2;
  while (await prisma.resource.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${baseSlug}-${index}`;
    index += 1;
  }
  return slug;
}

async function findRoleIdByKey(prisma: FastifyInstance["prisma"], roleKey?: string | null) {
  if (!roleKey) return null;
  const role = await prisma.roleOption.findUnique({ where: { key: roleKey }, select: { id: true } });
  if (!role) throw new HttpError(400, "BAD_REQUEST", "Invalid resource role key");
  return role.id;
}

async function replaceResourceTags(tx: Prisma.TransactionClient, resourceId: string, tagKeys?: string[]) {
  if (!tagKeys) return;
  const uniqueTagKeys = [...new Set(tagKeys)];
  const tags = await tx.tag.findMany({ where: { key: { in: uniqueTagKeys } }, select: { id: true } });
  if (tags.length !== uniqueTagKeys.length) {
    throw new HttpError(400, "BAD_REQUEST", "Invalid resource tag keys");
  }
  await tx.resourceTag.deleteMany({ where: { resourceId } });
  if (tags.length) {
    await tx.resourceTag.createMany({
      data: tags.map((tag) => ({ resourceId, tagId: tag.id }))
    });
  }
}

async function createResourcePackageAsset(
  fastify: FastifyInstance,
  resourceId: string,
  input: z.infer<typeof packageAssetSchema>,
  ownerId?: string
) {
  const objectKey = `packages/${resourceId}/${Date.now()}-${input.originalName}`;
  const asset = await fastify.prisma.uploadAsset.create({
    data: {
      ownerId,
      resourceId,
      driver: "local",
      status: "attached",
      objectKey,
      originalName: input.originalName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      publicUrl: input.publicUrl || null
    }
  });
  const resource = await fastify.prisma.resource.update({
    where: { id: resourceId },
    data: {
      packageAssetId: asset.id,
      sizeBytes: asset.sizeBytes
    },
    include: { role: true, tags: { include: { tag: true } }, packageAsset: true }
  });
  return resource;
}

const adminUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  status: true,
  avatarUrl: true,
  bio: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.UserSelect;

export async function adminRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.requireAdmin);

  fastify.get("/admin/dashboard", async () => {
    const [users, resources, pendingSubmissions, downloads] = await Promise.all([
      fastify.prisma.user.count(),
      fastify.prisma.resource.count(),
      fastify.prisma.submission.count({ where: { status: "pending" } }),
      fastify.prisma.downloadEvent.count()
    ]);
    return ok({ users, resources, pendingSubmissions, downloads });
  });

  fastify.get("/admin/users", async (request) => {
    const parsed = userListQuerySchema.safeParse(request.query);
    if (!parsed.success) throw validationError("Invalid user query parameters");
    const { page, pageSize, keyword, role, status } = parsed.data;
    const where: Prisma.UserWhereInput = {
      ...(keyword
        ? {
            OR: [
              { name: { contains: keyword, mode: "insensitive" } },
              { email: { contains: keyword, mode: "insensitive" } },
              { bio: { contains: keyword, mode: "insensitive" } }
            ]
          }
        : {}),
      ...(role === "all" ? {} : { role }),
      ...(status === "all" ? {} : { status })
    };
    const [items, total, superadminCount, adminCount, authorCount, userCount, activeCount, disabledCount, bannedCount] = await fastify.prisma.$transaction([
      fastify.prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: adminUserSelect
      }),
      fastify.prisma.user.count({ where }),
      fastify.prisma.user.count({ where: { role: "superadmin" } }),
      fastify.prisma.user.count({ where: { role: "admin" } }),
      fastify.prisma.user.count({ where: { role: "author" } }),
      fastify.prisma.user.count({ where: { role: "user" } }),
      fastify.prisma.user.count({ where: { status: "active" } }),
      fastify.prisma.user.count({ where: { status: "disabled" } }),
      fastify.prisma.user.count({ where: { status: "banned" } })
    ]);
    return ok({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      stats: {
        roles: { superadmin: superadminCount, admin: adminCount, author: authorCount, user: userCount },
        statuses: { active: activeCount, disabled: disabledCount, banned: bannedCount }
      }
    });
  });

  fastify.patch("/admin/users/:id", async (request) => {
    const { id } = request.params as { id: string };
    const parsed = userUpdateSchema.safeParse(request.body);
    if (!parsed.success) throw validationError("Invalid user update parameters");

    const target = await fastify.prisma.user.findUnique({ where: { id }, select: { id: true, role: true, status: true } });
    if (!target) throw new HttpError(404, "NOT_FOUND", "User not found");
    const actorRole = request.authUser?.role;

    if (target.role === "superadmin" && actorRole !== "superadmin") {
      throw new HttpError(403, "FORBIDDEN", "Administrators cannot modify the super administrator account");
    }
    if (target.role === "superadmin" && (parsed.data.role !== undefined || parsed.data.status !== undefined)) {
      throw new HttpError(403, "FORBIDDEN", "The super administrator account is protected in user management");
    }
    if (parsed.data.role === "superadmin" && target.role !== "superadmin") {
      throw new HttpError(403, "FORBIDDEN", "Other users cannot be promoted to super administrator");
    }

    const activeAdminCount = await fastify.prisma.user.count({
      where: { role: { in: [...adminRoles] }, status: "active" }
    });
    const wouldLoseAdminRole = isAdminRole(target.role) && parsed.data.role !== undefined && !isAdminRole(parsed.data.role);
    const wouldLoseActiveState = isAdminRole(target.role) && target.status === "active" && parsed.data.status !== undefined && parsed.data.status !== "active";
    if ((wouldLoseAdminRole || wouldLoseActiveState) && activeAdminCount <= 1) {
      throw new HttpError(409, "CONFLICT", "At least one active administrator account must remain");
    }

    const user = await fastify.prisma.user.update({
      where: { id },
      data: parsed.data,
      select: adminUserSelect
    });
    await writeAudit(fastify, { actorId: request.authUser?.id, action: "user.update", targetType: "User", targetId: id, metadata: parsed.data, ip: request.ip });
    return ok(user, "User updated");
  });

  fastify.delete("/admin/users/:id", async (request) => {
    const { id } = request.params as { id: string };
    const target = await fastify.prisma.user.findUnique({ where: { id }, select: { id: true, role: true, status: true } });
    if (!target) throw new HttpError(404, "NOT_FOUND", "User not found");
    if (target.id === request.authUser?.id) {
      throw new HttpError(409, "CONFLICT", "The current login account cannot be deleted");
    }
    if (target.role === "superadmin") {
      throw new HttpError(403, "FORBIDDEN", "The super administrator account cannot be deleted");
    }

    const activeAdminCount = await fastify.prisma.user.count({
      where: { role: { in: [...adminRoles] }, status: "active" }
    });
    if (isAdminRole(target.role) && target.status === "active" && activeAdminCount <= 1) {
      throw new HttpError(409, "CONFLICT", "At least one active administrator account must remain");
    }

    await fastify.prisma.user.delete({ where: { id } });
    await writeAudit(fastify, { actorId: request.authUser?.id, action: "user.delete", targetType: "User", targetId: id, ip: request.ip });
    return ok({ deleted: true }, "User deleted");
  });

  fastify.get("/admin/resources", async () => {
    const resources = await fastify.prisma.resource.findMany({
      orderBy: { updatedAt: "desc" },
      include: { role: true, tags: { include: { tag: true } }, packageAsset: true }
    });
    return ok(jsonSafe(resources));
  });

  fastify.post("/admin/resources", async (request) => {
    const parsed = resourceCreateSchema.safeParse(request.body);
    if (!parsed.success) throw validationError("Invalid resource create parameters");
    const slug = await createUniqueResourceSlug(fastify.prisma, parsed.data.titleEn || parsed.data.titleZh);
    const roleId = await findRoleIdByKey(fastify.prisma, parsed.data.roleKey);
    const showcaseImages = parsed.data.showcaseImages?.filter((item) => item.url) ?? [];
    const resource = await fastify.prisma.$transaction(async (tx) => {
      const created = await tx.resource.create({
        data: {
          slug,
          titleZh: parsed.data.titleZh,
          titleEn: parsed.data.titleEn || null,
          authorName: parsed.data.authorName,
          roleId,
          badge: parsed.data.badge || null,
          coverImageUrl: parsed.data.coverImageUrl || null,
          coverCropY: parsed.data.coverCropY ?? 50,
          showcaseImageUrl: showcaseImages[0]?.url ?? parsed.data.showcaseImageUrl ?? null,
          showcaseImages: showcaseImages as Prisma.InputJsonValue,
          originalPostUrl: parsed.data.originalPostUrl || null,
          descriptionZh: parsed.data.descriptionZh || null,
          descriptionEn: parsed.data.descriptionEn || null,
          version: parsed.data.version,
          gameVersion: parsed.data.gameVersion || null,
          cardCount: parsed.data.cardCount ?? 0,
          sizeBytes: parsed.data.sizeBytes ?? null,
          status: parsed.data.status ?? "draft",
          isVisible: parsed.data.isVisible ?? true,
          hotScore: parsed.data.hotScore ?? 0,
          showOnHome: parsed.data.showOnHome ?? false,
          homeSortOrder: parsed.data.homeSortOrder ?? 0,
          publishedAt: parsed.data.status === "published" ? new Date() : null
        }
      });
      await replaceResourceTags(tx, created.id, parsed.data.tagKeys ?? []);
      return tx.resource.findUniqueOrThrow({
        where: { id: created.id },
        include: { role: true, tags: { include: { tag: true } }, packageAsset: true }
      });
    });
    await writeAudit(fastify, { actorId: request.authUser?.id, action: "resource.create", targetType: "Resource", targetId: resource.id, metadata: { slug }, ip: request.ip });
    return ok(jsonSafe(resource), "Resource created");
  });

  fastify.patch("/admin/resources/:id", async (request) => {
    const { id } = request.params as { id: string };
    const parsed = resourceUpdateSchema.safeParse(request.body);
    if (!parsed.success) throw validationError("Invalid resource update parameters");
    const data = {
      ...parsed.data,
      tagKeys: undefined,
      ...(parsed.data.titleEn !== undefined ? { titleEn: parsed.data.titleEn || null } : {}),
      ...(parsed.data.authorName !== undefined ? { authorName: parsed.data.authorName } : {}),
      ...(parsed.data.roleKey !== undefined ? { roleId: await findRoleIdByKey(fastify.prisma, parsed.data.roleKey) } : {}),
      ...(parsed.data.badge !== undefined ? { badge: parsed.data.badge || null } : {}),
      ...(parsed.data.coverImageUrl !== undefined ? { coverImageUrl: parsed.data.coverImageUrl || null } : {}),
      ...(parsed.data.showcaseImageUrl !== undefined ? { showcaseImageUrl: parsed.data.showcaseImageUrl || null } : {}),
      ...(parsed.data.originalPostUrl !== undefined ? { originalPostUrl: parsed.data.originalPostUrl || null } : {}),
      ...(parsed.data.descriptionZh !== undefined ? { descriptionZh: parsed.data.descriptionZh || null } : {}),
      ...(parsed.data.descriptionEn !== undefined ? { descriptionEn: parsed.data.descriptionEn || null } : {}),
      ...(parsed.data.gameVersion !== undefined ? { gameVersion: parsed.data.gameVersion || null } : {}),
      ...(parsed.data.packageAssetId !== undefined ? { packageAssetId: parsed.data.packageAssetId || null } : {}),
      ...(parsed.data.showcaseImages !== undefined
        ? {
            showcaseImages: parsed.data.showcaseImages.filter((item) => item.url) as Prisma.InputJsonValue,
            showcaseImageUrl: parsed.data.showcaseImages.find((item) => item.url)?.url ?? null
          }
        : {})
    };
    const resource = await fastify.prisma.$transaction(async (tx) => {
      await replaceResourceTags(tx, id, parsed.data.tagKeys);

      return tx.resource.update({
        where: { id },
        data,
        include: { role: true, tags: { include: { tag: true } }, packageAsset: true }
      });
    });
    await writeAudit(fastify, { actorId: request.authUser?.id, action: "resource.update", targetType: "Resource", targetId: id, metadata: data as Prisma.InputJsonValue, ip: request.ip });
    return ok(jsonSafe(resource), "Resource updated");
  });

  fastify.post("/admin/resources/:id/package", async (request) => {
    const { id } = request.params as { id: string };
    const parsed = packageAssetSchema.safeParse(request.body);
    if (!parsed.success) throw validationError("Invalid package file parameters");
    const current = await fastify.prisma.resource.findUnique({ where: { id }, select: { id: true } });
    if (!current) throw new HttpError(404, "NOT_FOUND", "Resource not found");
    const resource = await createResourcePackageAsset(fastify, id, parsed.data, request.authUser?.id);
    await writeAudit(fastify, {
      actorId: request.authUser?.id,
      action: "resource.package.attach",
      targetType: "Resource",
      targetId: id,
      metadata: {
        ...parsed.data,
        sizeBytes: parsed.data.sizeBytes.toString()
      },
      ip: request.ip
    });
    return ok(jsonSafe(resource), "Package file attached");
  });

  fastify.delete("/admin/resources/:id/package", async (request) => {
    const { id } = request.params as { id: string };
    const resource = await fastify.prisma.resource.update({
      where: { id },
      data: { packageAssetId: null, sizeBytes: null },
      include: { role: true, tags: { include: { tag: true } }, packageAsset: true }
    });
    await writeAudit(fastify, {
      actorId: request.authUser?.id,
      action: "resource.package.detach",
      targetType: "Resource",
      targetId: id,
      ip: request.ip
    });
    return ok(jsonSafe(resource), "Package file detached");
  });

  fastify.post("/admin/submissions/:id/approve", async (request) => {
    const { id } = request.params as { id: string };
    const submission = await fastify.prisma.submission.update({
      where: { id },
      data: { status: "approved", reviewedAt: new Date() }
    });
    await writeAudit(fastify, { actorId: request.authUser?.id, action: "submission.approve", targetType: "Submission", targetId: id, ip: request.ip });
    return ok(submission, "Submission approved");
  });

  fastify.post("/admin/submissions/:id/reject", async (request) => {
    const { id } = request.params as { id: string };
    const parsed = rejectSchema.safeParse(request.body);
    if (!parsed.success) throw validationError("Reject reason is required");
    const submission = await fastify.prisma.submission.update({
      where: { id },
      data: { status: "rejected", reviewReason: parsed.data.reason, reviewedAt: new Date() }
    });
    await writeAudit(fastify, { actorId: request.authUser?.id, action: "submission.reject", targetType: "Submission", targetId: id, metadata: parsed.data, ip: request.ip });
    return ok(submission, "Submission rejected");
  });

  fastify.get("/admin/submissions", async () => {
    return ok(jsonSafe(await fastify.prisma.submission.findMany({ orderBy: { updatedAt: "desc" }, include: { submitter: true, assets: true } })));
  });

  fastify.get("/admin/tags", async () => ok(await fastify.prisma.tag.findMany({ orderBy: { createdAt: "asc" } })));

  fastify.post("/admin/tags", async (request) => {
    const parsed = tagSchema.safeParse(request.body);
    if (!parsed.success) throw validationError("Invalid tag parameters");
    const existing = await fastify.prisma.tag.findUnique({ where: { key: parsed.data.key } });
    if (existing) throw new HttpError(409, "CONFLICT", "Tag key already exists");
    const tag = await fastify.prisma.tag.create({ data: parsed.data });
    await writeAudit(fastify, { actorId: request.authUser?.id, action: "tag.create", targetType: "Tag", targetId: tag.id, metadata: parsed.data, ip: request.ip });
    return ok(tag, "Tag created");
  });

  fastify.patch("/admin/tags/:id", async (request) => {
    const { id } = request.params as { id: string };
    const parsed = tagUpdateSchema.safeParse(request.body);
    if (!parsed.success) throw validationError("Invalid tag update parameters");
    const current = await fastify.prisma.tag.findUnique({ where: { id } });
    if (!current) throw new HttpError(404, "NOT_FOUND", "Tag not found");
    if (parsed.data.key && parsed.data.key !== current.key) {
      const existing = await fastify.prisma.tag.findUnique({ where: { key: parsed.data.key } });
      if (existing) throw new HttpError(409, "CONFLICT", "Tag key already exists");
    }
    const tag = await fastify.prisma.tag.update({ where: { id }, data: parsed.data });
    await writeAudit(fastify, { actorId: request.authUser?.id, action: "tag.update", targetType: "Tag", targetId: id, metadata: parsed.data, ip: request.ip });
    return ok(tag, "Tag updated");
  });

  fastify.delete("/admin/tags/:id", async (request) => {
    const { id } = request.params as { id: string };
    const current = await fastify.prisma.tag.findUnique({
      where: { id },
      include: { _count: { select: { resources: true } } }
    });
    if (!current) throw new HttpError(404, "NOT_FOUND", "Tag not found");
    await fastify.prisma.tag.delete({ where: { id } });
    await writeAudit(fastify, { actorId: request.authUser?.id, action: "tag.delete", targetType: "Tag", targetId: id, metadata: { key: current.key, affectedResources: current._count.resources }, ip: request.ip });
    return ok({ deleted: true, affectedResources: current._count.resources }, "Tag deleted");
  });

  fastify.get("/admin/roles", async () => ok(await fastify.prisma.roleOption.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] })));

  fastify.post("/admin/roles", async (request) => {
    const parsed = roleSchema.safeParse(request.body);
    if (!parsed.success) throw validationError("Invalid role parameters");
    const existing = await fastify.prisma.roleOption.findUnique({ where: { key: parsed.data.key } });
    if (existing) throw new HttpError(409, "CONFLICT", "Role key already exists");
    const role = await fastify.prisma.roleOption.create({ data: parsed.data });
    await writeAudit(fastify, { actorId: request.authUser?.id, action: "role.create", targetType: "RoleOption", targetId: role.id, metadata: parsed.data, ip: request.ip });
    return ok(role, "Role created");
  });

  fastify.patch("/admin/roles/:id", async (request) => {
    const { id } = request.params as { id: string };
    const parsed = roleUpdateSchema.safeParse(request.body);
    if (!parsed.success) throw validationError("Invalid role update parameters");
    const current = await fastify.prisma.roleOption.findUnique({ where: { id } });
    if (!current) throw new HttpError(404, "NOT_FOUND", "Role not found");
    if (parsed.data.key && parsed.data.key !== current.key) {
      const existing = await fastify.prisma.roleOption.findUnique({ where: { key: parsed.data.key } });
      if (existing) throw new HttpError(409, "CONFLICT", "Role key already exists");
    }
    const role = await fastify.prisma.roleOption.update({ where: { id }, data: parsed.data });
    await writeAudit(fastify, { actorId: request.authUser?.id, action: "role.update", targetType: "RoleOption", targetId: id, metadata: parsed.data, ip: request.ip });
    return ok(role, "Role updated");
  });

  fastify.delete("/admin/roles/:id", async (request) => {
    const { id } = request.params as { id: string };
    const current = await fastify.prisma.roleOption.findUnique({
      where: { id },
      include: { _count: { select: { resources: true } } }
    });
    if (!current) throw new HttpError(404, "NOT_FOUND", "Role not found");
    await fastify.prisma.roleOption.delete({ where: { id } });
    await writeAudit(fastify, { actorId: request.authUser?.id, action: "role.delete", targetType: "RoleOption", targetId: id, metadata: { key: current.key, affectedResources: current._count.resources }, ip: request.ip });
    return ok({ deleted: true, affectedResources: current._count.resources }, "Role deleted");
  });

  fastify.get("/admin/audit-logs", async () => {
    return ok(await fastify.prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { actor: true } }));
  });

  fastify.setNotFoundHandler(async () => {
    throw new HttpError(404, "NOT_FOUND", "Admin endpoint not found");
  });
}
