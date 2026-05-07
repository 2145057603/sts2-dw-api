import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hash } from "argon2";
import modData from "../../src/data/modResources.json" with { type: "json" };

const prisma = new PrismaClient();

const parseSize = (value: string) => {
  const match = value.match(/([\d.]+)\s*MB/i);
  if (!match) return null;
  return BigInt(Math.round(Number(match[1]) * 1024 * 1024));
};

const slugify = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const previewImages = [
  { cover: "/mod-placeholders/cover-1.svg", cropY: 35, showcases: [{ url: "/mod-placeholders/showcase-1.svg", cropY: 50 }] },
  { cover: "/mod-placeholders/cover-2.svg", cropY: 50, showcases: [{ url: "/mod-placeholders/showcase-2.svg", cropY: 50 }] },
  { cover: "/mod-placeholders/cover-3.svg", cropY: 45, showcases: [{ url: "/mod-placeholders/showcase-3.svg", cropY: 50 }] },
  { cover: "/mod-placeholders/cover-4.svg", cropY: 55, showcases: [{ url: "/mod-placeholders/showcase-4.svg", cropY: 50 }] },
  { cover: "/mod-placeholders/cover-5.svg", cropY: 50, showcases: [{ url: "/mod-placeholders/showcase-5.svg", cropY: 50 }] },
  { cover: "/mod-placeholders/cover-6.svg", cropY: 50, showcases: [{ url: "/mod-placeholders/showcase-6.svg", cropY: 50 }] }
];

const adminAccount = {
  email: "admin@local.test",
  name: "admin",
  password: "Admin123456"
};

const managerAccount = {
  email: "manager@local.test",
  name: "manager",
  password: "Manager123456"
};

const authorAccounts = [
  {
    email: "author.nighthawk@local.test",
    name: "NightHawk",
    bio: "Local seeded author account for resource ownership."
  },
  {
    email: "author.wistaria@local.test",
    name: "Wistaria",
    bio: "Local seeded author account for submission review."
  },
  {
    email: "author.star@local.test",
    name: "星语",
    bio: "Local seeded author account for bilingual data checks."
  }
];

async function upsertUsers() {
  const admin = await prisma.user.upsert({
    where: { email: adminAccount.email },
    update: {
      name: adminAccount.name,
      role: "superadmin",
      status: "active",
      passwordHash: await hash(adminAccount.password)
    },
    create: {
      email: adminAccount.email,
      name: adminAccount.name,
      role: "superadmin",
      status: "active",
      passwordHash: await hash(adminAccount.password),
      bio: "Local development super administrator."
    }
  });

  const manager = await prisma.user.upsert({
    where: { email: managerAccount.email },
    update: {
      name: managerAccount.name,
      role: "admin",
      status: "active",
      passwordHash: await hash(managerAccount.password)
    },
    create: {
      email: managerAccount.email,
      name: managerAccount.name,
      role: "admin",
      status: "active",
      passwordHash: await hash(managerAccount.password),
      bio: "Local development administrator."
    }
  });

  const authors = [];
  for (const author of authorAccounts) {
    authors.push(
      await prisma.user.upsert({
        where: { email: author.email },
        update: {
          name: author.name,
          role: "author",
          status: "active",
          bio: author.bio
        },
        create: {
          email: author.email,
          name: author.name,
          role: "author",
          status: "active",
          passwordHash: await hash("Author123456"),
          bio: author.bio
        }
      })
    );
  }

  const user = await prisma.user.upsert({
    where: { email: "user.reader@local.test" },
    update: {
      name: "Reader",
      role: "user",
      status: "active"
    },
    create: {
      email: "user.reader@local.test",
      name: "Reader",
      role: "user",
      status: "active",
      passwordHash: await hash("User123456"),
      bio: "Local seeded normal user."
    }
  });

  return { admin, manager, authors, user };
}

async function upsertTaxonomy() {
  for (const [index, role] of modData.roles.filter((item) => item.id !== "all").entries()) {
    await prisma.roleOption.upsert({
      where: { key: role.id },
      update: { labelZh: role.zh, labelEn: role.en, sortOrder: index },
      create: { key: role.id, labelZh: role.zh, labelEn: role.en, sortOrder: index }
    });
  }

  for (const tag of modData.tags) {
    await prisma.tag.upsert({
      where: { key: tag.id },
      update: { labelZh: tag.zh, labelEn: tag.en },
      create: { key: tag.id, labelZh: tag.zh, labelEn: tag.en }
    });
  }
}

async function upsertResources(authors: Awaited<ReturnType<typeof upsertUsers>>["authors"]) {
  const resources = [];
  for (const [index, item] of modData.resources.entries()) {
    const role = await prisma.roleOption.findUnique({ where: { key: item.role } });
    const author = authors.find((account) => account.name === item.author) ?? authors[index % authors.length];
    const slug = slugify(item.title.en);
    const preview = previewImages[index % previewImages.length];
    const existingResource = await prisma.resource.findUnique({
      where: { slug },
      select: { id: true }
    });

    const resource = await prisma.resource.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        titleZh: item.title.zh,
        titleEn: item.title.en,
        badge: item.badge,
        coverImageUrl: preview.cover,
        coverCropY: preview.cropY,
        showcaseImageUrl: preview.showcases[0]?.url ?? null,
        showcaseImages: preview.showcases,
        originalPostUrl: `https://example.com/mods/${slug}`,
        descriptionZh: `${item.title.zh} 的本地演示资源描述。`,
        descriptionEn: `Local demo description for ${item.title.en}.`,
        authorId: author?.id,
        authorName: item.author,
        roleId: role?.id,
        rarity: item.rarity,
        version: item.version,
        gameVersion: "2.0.0",
        cardCount: 128,
        sizeBytes: parseSize(item.size),
        status: "published",
        isVisible: true,
        downloads: item.downloads,
        hotScore: item.hotScore,
        showOnHome: index < 4,
        homeSortOrder: index,
        tone: item.tone,
        publishedAt: new Date(item.date)
      }
    });

    if (!existingResource) {
      const tagKeys = new Set(item.tags.filter((tag) => /^[a-z0-9-]+$/i.test(tag)));
      for (const key of tagKeys) {
        const tag = await prisma.tag.findUnique({ where: { key } });
        if (tag) {
          await prisma.resourceTag.create({
            data: { resourceId: resource.id, tagId: tag.id }
          });
        }
      }
    }

    resources.push(resource);
  }

  return resources;
}

async function seedAdminWorkflows(
  users: Awaited<ReturnType<typeof upsertUsers>>,
  resources: Awaited<ReturnType<typeof upsertResources>>
) {
  const pending = await prisma.submission.upsert({
    where: { id: "local-submission-pending-card-pack" },
    update: {
      submitterId: users.authors[0].id,
      titleZh: "本地待审卡面包",
      titleEn: "Local Pending Card Pack",
      description: "Seeded pending submission for admin review.",
      version: "0.9.0",
      status: "pending",
      reviewReason: null,
      reviewedAt: null
    },
    create: {
      id: "local-submission-pending-card-pack",
      submitterId: users.authors[0].id,
      titleZh: "本地待审卡面包",
      titleEn: "Local Pending Card Pack",
      description: "Seeded pending submission for admin review.",
      version: "0.9.0",
      status: "pending"
    }
  });

  const rejected = await prisma.submission.upsert({
    where: { id: "local-submission-rejected-card-pack" },
    update: {
      submitterId: users.authors[1].id,
      titleZh: "本地已拒绝投稿",
      titleEn: "Local Rejected Submission",
      description: "Seeded rejected submission for audit display.",
      version: "0.8.0",
      status: "rejected",
      reviewReason: "Missing preview assets.",
      reviewedAt: new Date()
    },
    create: {
      id: "local-submission-rejected-card-pack",
      submitterId: users.authors[1].id,
      titleZh: "本地已拒绝投稿",
      titleEn: "Local Rejected Submission",
      description: "Seeded rejected submission for audit display.",
      version: "0.8.0",
      status: "rejected",
      reviewReason: "Missing preview assets.",
      reviewedAt: new Date()
    }
  });

  const firstResource = resources[0];
  const favorite = firstResource
    ? prisma.favorite.upsert({
        where: {
          userId_resourceId: {
            userId: users.user.id,
            resourceId: firstResource.id
          }
        },
        update: {},
        create: {
          userId: users.user.id,
          resourceId: firstResource.id
        }
      })
    : Promise.resolve(null);

  const assetTargets = [
    { id: "local-upload-resource-preview", resourceId: firstResource?.id, submissionId: null },
    { id: "local-upload-pending-submission", resourceId: null, submissionId: pending.id }
  ];

  for (const target of assetTargets) {
    await prisma.uploadAsset.upsert({
      where: { id: target.id },
      update: {
        ownerId: users.authors[0].id,
        resourceId: target.resourceId,
        submissionId: target.submissionId,
        status: "attached",
        publicUrl: `/uploads/${target.id}.zip`
      },
      create: {
        id: target.id,
        ownerId: users.authors[0].id,
        resourceId: target.resourceId,
        submissionId: target.submissionId,
        driver: "local",
        status: "attached",
        objectKey: `${target.id}.zip`,
        originalName: `${target.id}.zip`,
        mimeType: "application/zip",
        sizeBytes: BigInt(1024 * 1024 * 8),
        publicUrl: `/uploads/${target.id}.zip`
      }
    });
  }

  await favorite;

  if (firstResource) {
    for (let index = 0; index < 5; index += 1) {
      await prisma.downloadEvent.create({
        data: {
          resourceId: firstResource.id,
          userId: index % 2 === 0 ? users.user.id : null,
          ipHash: `local-dev-${index}`,
          userAgent: "Local seed script"
        }
      });
    }
  }

  await prisma.auditLog.createMany({
    data: [
      {
        actorId: users.admin.id,
        action: "seed.admin.ready",
        targetType: "User",
        targetId: users.admin.id,
        metadata: { email: users.admin.email }
      },
      {
        actorId: users.admin.id,
        action: "submission.reject",
        targetType: "Submission",
        targetId: rejected.id,
        metadata: { reason: "Missing preview assets." }
      },
      {
        actorId: users.admin.id,
        action: "resource.seed",
        targetType: "Resource",
        targetId: firstResource?.id,
        metadata: { count: resources.length }
      }
    ]
  });
}

async function main() {
  await upsertTaxonomy();
  const users = await upsertUsers();
  const resources = await upsertResources(users.authors);
  await seedAdminWorkflows(users, resources);
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
