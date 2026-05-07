import type { FastifyInstance } from "fastify";
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshSession,
  registerUser,
  sendRegisterCode
} from "../../services/auth-service.js";
import { loginSchema, refreshSchema, registerSchema, sendCodeSchema } from "../../schemas/auth.js";
import { validationError } from "../../utils/http-error.js";
import { ok } from "../../utils/response.js";

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post("/auth/send-code", async (request) => {
    const parsed = sendCodeSchema.safeParse(request.body);
    if (!parsed.success) throw validationError("请填写有效邮箱", { email: "邮箱格式不正确" });
    return ok(await sendRegisterCode(fastify, parsed.data), "验证码已发送");
  });

  fastify.post("/auth/register", async (request) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) throw validationError("请完整填写注册信息");
    return ok(await registerUser(fastify, request, parsed.data), "注册成功");
  });

  fastify.post("/auth/login", async (request) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) throw validationError("请填写账号与密码");
    return ok(await loginUser(fastify, request, parsed.data), "登录成功");
  });

  fastify.get("/auth/me", async (request) => {
    return ok(await getCurrentUser(fastify, request));
  });

  fastify.post("/auth/logout", async (request) => {
    const body = request.body as { refreshToken?: string } | undefined;
    return ok(await logoutUser(fastify, body?.refreshToken), "已退出登录");
  });

  fastify.post("/auth/refresh", async (request) => {
    const parsed = refreshSchema.safeParse(request.body);
    if (!parsed.success) throw validationError("刷新令牌无效");
    return ok(await refreshSession(fastify, parsed.data.refreshToken), "已刷新会话");
  });
}
