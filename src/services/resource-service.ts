import type { FastifyInstance } from "fastify";
import type { z } from "zod";
import type { resourceListQuerySchema } from "../schemas/resources.js";
import { HttpError } from "../utils/http-error.js";

type ResourceListQuery = z.infer<typeof resourceListQuerySchema>;

const toResourceDto = (resource: any) => ({
  id: resource.id,
  slug: resource.slug,
  title: { zh: resource.titleZh, en: resource.titleEn },
  badge: resource.badge,
  coverImageUrl: resource.coverImageUrl,
  coverCropY: resource.coverCropY,
  showcaseImageUrl: resource.showcaseImageUrl,
  showcaseImages: resource.showcaseImages,
  originalPostUrl: resource.originalPostUrl,
  description: { zh: resource.descriptionZh, en: resource.descriptionEn },
  author: resource.authorName,
  role: resource.role?.key ?? null,
  rarity: resource.rarity,
  version: resource.version,
  gameVersion: resource.gameVersion,
  cardCount: resource.cardCount,
  sizeBytes: resource.sizeBytes?.toString() ?? null,
  packageAsset: resource.packageAsset
    ? {
        id: resource.packageAsset.id,
        originalName: resource.packageAsset.originalName,
        mimeType: resource.packageAsset.mimeType,
        sizeBytes: resource.packageAsset.sizeBytes?.toString() ?? null,
        publicUrl: resource.packageAsset.publicUrl,
        status: resource.packageAsset.status
      }
    : null,
  status: resource.status,
  isVisible: resource.isVisible,
  downloads: resource.downloads,
  hotScore: resource.hotScore,
  showOnHome: resource.showOnHome,
  homeSortOrder: resource.homeSortOrder,
  tone: resource.tone,
  tags: resource.tags?.map((item: any) => ({
    id: item.tag.key,
    zh: item.tag.labelZh,
    en: item.tag.labelEn
  })) ?? [],
  publishedAt: resource.publishedAt?.toISOString() ?? null,
  updatedAt: resource.updatedAt.toISOString()
});

export async function listResources(fastify: FastifyInstance, query: ResourceListQuery) {
  const where: any = { status: "published", isVisible: true };
  if (query.q) {
    where.OR = [
      { titleZh: { contains: query.q, mode: "insensitive" } },
      { titleEn: { contains: query.q, mode: "insensitive" } },
      { authorName: { contains: query.q, mode: "insensitive" } }
    ];
  }
  if (query.role && query.role !== "all") where.role = { key: query.role };
  if (query.tags) {
    const tagKeys = query.tags.split(",").map((tag) => tag.trim()).filter(Boolean);
    if (tagKeys.length) {
      where.AND = tagKeys.map((key) => ({ tags: { some: { tag: { key } } } }));
    }
  }
  const orderBy =
    query.sort === "updated"
      ? { publishedAt: "desc" as const }
      : query.sort === "downloads"
        ? { downloads: "desc" as const }
        : { hotScore: "desc" as const };

  const [total, items] = await fastify.prisma.$transaction([
    fastify.prisma.resource.count({ where }),
    fastify.prisma.resource.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: { role: true, tags: { include: { tag: true } }, packageAsset: true }
    })
  ]);

  return {
    items: items.map(toResourceDto),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize))
  };
}

export async function listHomeResources(fastify: FastifyInstance) {
  const items = await fastify.prisma.resource.findMany({
    where: { status: "published", isVisible: true, showOnHome: true },
    orderBy: [{ homeSortOrder: "asc" }, { hotScore: "desc" }],
    include: { role: true, tags: { include: { tag: true } }, packageAsset: true }
  });
  return items.map(toResourceDto);
}

export async function getResource(fastify: FastifyInstance, idOrSlug: string) {
  const resource = await fastify.prisma.resource.findFirst({
    where: {
      status: "published",
      isVisible: true,
      OR: [{ id: idOrSlug }, { slug: idOrSlug }]
    },
    include: { role: true, tags: { include: { tag: true } }, packageAsset: true, assets: true }
  });
  if (!resource) throw new HttpError(404, "NOT_FOUND", "资源不存在");
  return toResourceDto(resource);
}

export async function getResourceMeta(fastify: FastifyInstance) {
  const [roles, tags] = await fastify.prisma.$transaction([
    fastify.prisma.roleOption.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    fastify.prisma.tag.findMany({ orderBy: { createdAt: "asc" } })
  ]);
  return {
    roles: [{ id: "all", zh: "全部", en: "All" }, ...roles.map((role) => ({ id: role.key, zh: role.labelZh, en: role.labelEn }))],
    tags: tags.map((tag) => ({ id: tag.key, zh: tag.labelZh, en: tag.labelEn })),
    sortOptions: [
      { id: "hot", zh: "按热门排序", en: "Sort by Popularity" },
      { id: "updated", zh: "按更新时间排序", en: "Sort by Updated Date" },
      { id: "downloads", zh: "按下载量排序", en: "Sort by Downloads" }
    ]
  };
}

export async function getResourceStats(fastify: FastifyInstance) {
  const [total, authors, monthUpdated, downloads] = await Promise.all([
    fastify.prisma.resource.count({ where: { status: "published", isVisible: true } }),
    fastify.prisma.resource.findMany({ where: { status: "published", isVisible: true }, select: { authorName: true }, distinct: ["authorName"] }),
    fastify.prisma.resource.count({
      where: {
        status: "published",
        isVisible: true,
        publishedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
      }
    }),
    fastify.prisma.resource.aggregate({ where: { status: "published", isVisible: true }, _sum: { downloads: true } })
  ]);
  return {
    total,
    authors: authors.length,
    monthUpdated,
    downloads: downloads._sum.downloads ?? 0
  };
}

export async function recordDownload(fastify: FastifyInstance, resourceId: string, userAgent?: string, ipHash?: string) {
  const resource = await fastify.prisma.resource.findFirst({
    where: { id: resourceId, status: "published", isVisible: true },
    include: { packageAsset: true }
  });
  if (!resource) throw new HttpError(404, "NOT_FOUND", "资源不存在");
  await fastify.prisma.$transaction([
    fastify.prisma.downloadEvent.create({ data: { resourceId, userAgent, ipHash } }),
    fastify.prisma.resource.update({ where: { id: resourceId }, data: { downloads: { increment: 1 } } })
  ]);
  return {
    downloadUrl: resource.packageAsset?.publicUrl ?? null,
    packageAsset: resource.packageAsset
      ? {
          id: resource.packageAsset.id,
          originalName: resource.packageAsset.originalName,
          mimeType: resource.packageAsset.mimeType,
          sizeBytes: resource.packageAsset.sizeBytes.toString(),
          status: resource.packageAsset.status
        }
      : null,
    recorded: true
  };
}
