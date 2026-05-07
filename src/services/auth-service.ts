import type { FastifyInstance, FastifyRequest } from "fastify";
import { hash, verify } from "argon2";
import { env } from "../config/env.js";
import type { LoginInput, RegisterInput, SendCodeInput } from "../schemas/auth.js";
import type { PublicUser } from "../types/api.js";
import { HttpError } from "../utils/http-error.js";
import { addDays, addMinutes, randomToken, sha256 } from "../utils/tokens.js";
import { renderVerificationMail, sendMail } from "./mail-service.js";

const codePurpose = {
  register: "register"
} as const;

export const toPublicUser = (user: {
  id: string;
  email: string;
  name: string;
  role: "user" | "author" | "admin" | "superadmin";
  status: "active" | "disabled" | "banned";
  avatarUrl?: string | null;
  bio?: string | null;
  createdAt: Date;
  updatedAt: Date;
}): PublicUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  roles: [user.role],
  isAdmin: user.role === "admin" || user.role === "superadmin",
  status: user.status,
  avatarUrl: user.avatarUrl,
  bio: user.bio,
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt.toISOString()
});

export async function sendRegisterCode(fastify: FastifyInstance, input: SendCodeInput) {
  const email = input.email.toLowerCase();
  const recent = await fastify.prisma.verificationCode.findFirst({
    where: {
      email,
      purpose: codePurpose.register,
      createdAt: { gt: addMinutes(new Date(), -1) }
    },
    orderBy: { createdAt: "desc" }
  });
  if (recent) throw new HttpError(429, "RATE_LIMITED", "验证码发送过于频繁，请稍后再试");

  const code = String(Math.floor(100000 + Math.random() * 900000));
  await fastify.prisma.verificationCode.create({
    data: {
      email,
      purpose: codePurpose.register,
      codeHash: await hash(code),
      expiresAt: addMinutes(new Date(), 10)
    }
  });

  const mail = renderVerificationMail(code);
  const delivery = await sendMail({
    to: email,
    ...mail
  });
  fastify.log.info({ email, provider: delivery.provider, id: delivery.id }, "verification code sent");
  return { sent: true, ttlSeconds: 600 };
}

export async function registerUser(fastify: FastifyInstance, request: FastifyRequest, input: RegisterInput) {
  const email = input.email.toLowerCase();
  const existing = await fastify.prisma.user.findUnique({ where: { email } });
  if (existing) throw new HttpError(409, "CONFLICT", "邮箱已注册");

  const code = await fastify.prisma.verificationCode.findFirst({
    where: {
      email,
      purpose: codePurpose.register,
      consumedAt: null,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: "desc" }
  });
  if (!code || !(await verify(code.codeHash, input.code))) {
    throw new HttpError(400, "VALIDATION_ERROR", "验证码无效或已过期", { code: "验证码无效或已过期" });
  }

  const user = await fastify.prisma.$transaction(async (tx) => {
    await tx.verificationCode.update({
      where: { id: code.id },
      data: { consumedAt: new Date() }
    });
    return tx.user.create({
      data: {
        email,
        name: input.name,
        passwordHash: await hash(input.password)
      }
    });
  });

  return issueSession(fastify, request, user);
}

export async function loginUser(fastify: FastifyInstance, request: FastifyRequest, input: LoginInput) {
  const account = input.account.toLowerCase();
  const user = await fastify.prisma.user.findFirst({
    where: {
      OR: [{ email: account }, { name: input.account }]
    }
  });
  if (!user || !(await verify(user.passwordHash, input.password))) {
    throw new HttpError(401, "UNAUTHORIZED", "账号或密码错误");
  }
  if (user.status !== "active") {
    throw new HttpError(403, "FORBIDDEN", "账号不可用");
  }

  return issueSession(fastify, request, user, input.remember === "on" || input.remember === true);
}

export async function issueSession(
  fastify: FastifyInstance,
  request: FastifyRequest,
  user: Parameters<typeof toPublicUser>[0],
  remember = false
) {
  const refreshToken = randomToken();
  const expiresAt = addDays(new Date(), remember ? env.REFRESH_TOKEN_TTL_DAYS : 1);
  await fastify.prisma.session.create({
    data: {
      userId: user.id,
      refreshHash: sha256(refreshToken),
      userAgent: request.headers["user-agent"],
      ip: request.ip,
      expiresAt
    }
  });

  const token = fastify.jwt.sign(
    { sub: user.id, role: user.role },
    { expiresIn: env.ACCESS_TOKEN_TTL }
  );

  return {
    token,
    accessToken: token,
    refreshToken,
    expiresAt,
    user: toPublicUser(user)
  };
}

export async function getCurrentUser(fastify: FastifyInstance, request: FastifyRequest) {
  const payload = await request.jwtVerify<{ sub: string }>();
  const user = await fastify.prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.status !== "active") throw new HttpError(401, "UNAUTHORIZED", "登录已失效");
  return toPublicUser(user);
}

export async function logoutUser(fastify: FastifyInstance, refreshToken?: string) {
  if (!refreshToken) return { revoked: false };
  await fastify.prisma.session.updateMany({
    where: {
      refreshHash: sha256(refreshToken),
      revokedAt: null
    },
    data: { revokedAt: new Date() }
  });
  return { revoked: true };
}

export async function refreshSession(fastify: FastifyInstance, refreshToken: string) {
  const session = await fastify.prisma.session.findUnique({
    where: { refreshHash: sha256(refreshToken) },
    include: { user: true }
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || session.user.status !== "active") {
    throw new HttpError(401, "UNAUTHORIZED", "刷新会话已失效");
  }
  const token = fastify.jwt.sign(
    { sub: session.user.id, role: session.user.role },
    { expiresIn: env.ACCESS_TOKEN_TTL }
  );
  return {
    token,
    accessToken: token,
    refreshToken,
    expiresAt: session.expiresAt,
    user: toPublicUser(session.user)
  };
}
