import type { FastifyInstance } from "fastify";

type ApiDocItem = {
  method: string;
  path: string;
  auth: string;
  description: string;
};

const implementedRoutes: ApiDocItem[] = [
  { method: "GET", path: "/health", auth: "Public", description: "服务存活检查，用于确认 API 进程正在运行。" },
  { method: "GET", path: "/ready", auth: "Public", description: "服务就绪检查，会验证数据库连接是否可用。" },
  { method: "GET", path: "/api/v1/health", auth: "Public", description: "版本化健康检查接口。" },
  { method: "POST", path: "/api/v1/auth/send-code", auth: "Public", description: "发送注册邮箱验证码。" },
  { method: "POST", path: "/api/v1/auth/register", auth: "Public", description: "注册用户并返回登录会话。" },
  { method: "POST", path: "/api/v1/auth/login", auth: "Public", description: "用户登录并返回登录会话。" },
  { method: "GET", path: "/api/v1/auth/me", auth: "Bearer", description: "读取当前已登录用户信息。" },
  { method: "POST", path: "/api/v1/auth/logout", auth: "Bearer optional", description: "退出登录；如果提供刷新令牌，则撤销对应会话。" },
  { method: "POST", path: "/api/v1/auth/refresh", auth: "Public", description: "使用刷新令牌换取新的访问令牌。" },
  { method: "GET", path: "/api/v1/resources", auth: "Public", description: "分页查询已发布资源，支持筛选、搜索与排序。" },
  { method: "GET", path: "/api/v1/resources/meta", auth: "Public", description: "读取公开筛选元数据，包括角色、标签和排序选项。" },
  { method: "GET", path: "/api/v1/resources/stats", auth: "Public", description: "读取公开资源统计数据。" },
  { method: "GET", path: "/api/v1/resources/:id", auth: "Public", description: "按资源 ID 或别名读取已发布资源详情。" },
  { method: "POST", path: "/api/v1/resources/:id/download", auth: "Public", description: "记录资源下载事件。" },
  { method: "POST", path: "/api/v1/uploads", auth: "Bearer", description: "创建上传记录并返回上传目标信息。" },
  { method: "GET", path: "/api/v1/uploads/:id", auth: "Bearer", description: "读取当前用户的上传记录。" },
  { method: "GET", path: "/api/v1/submissions/me", auth: "Bearer", description: "列出当前用户的投稿记录。" },
  { method: "POST", path: "/api/v1/submissions", auth: "Bearer", description: "创建投稿草稿。" },
  { method: "PATCH", path: "/api/v1/submissions/:id", auth: "Bearer", description: "更新可编辑状态下的投稿。" },
  { method: "POST", path: "/api/v1/submissions/:id/submit", auth: "Bearer", description: "将投稿草稿提交审核。" },
  { method: "POST", path: "/api/v1/submissions/:id/withdraw", auth: "Bearer", description: "撤回当前用户的投稿。" },
  { method: "GET", path: "/api/v1/admin/dashboard", auth: "Admin", description: "读取后台仪表盘统计数据。" },
  { method: "GET", path: "/api/v1/admin/users", auth: "Admin", description: "列出用户账号。" },
  { method: "PATCH", path: "/api/v1/admin/users/:id", auth: "Admin", description: "更新用户角色或账号状态。" },
  { method: "GET", path: "/api/v1/admin/resources", auth: "Admin", description: "列出后台资源管理数据。" },
  { method: "PATCH", path: "/api/v1/admin/resources/:id", auth: "Admin", description: "更新资源字段。" },
  { method: "GET", path: "/api/v1/admin/submissions", auth: "Admin", description: "列出待审核和历史投稿。" },
  { method: "POST", path: "/api/v1/admin/submissions/:id/approve", auth: "Admin", description: "审核通过投稿。" },
  { method: "POST", path: "/api/v1/admin/submissions/:id/reject", auth: "Admin", description: "填写原因并拒绝投稿。" },
  { method: "GET", path: "/api/v1/admin/tags", auth: "Admin", description: "列出资源标签。" },
  { method: "POST", path: "/api/v1/admin/tags", auth: "Admin", description: "创建资源标签。" },
  { method: "GET", path: "/api/v1/admin/roles", auth: "Admin", description: "列出角色筛选选项。" },
  { method: "POST", path: "/api/v1/admin/roles", auth: "Admin", description: "创建角色筛选选项。" },
  { method: "GET", path: "/api/v1/admin/audit-logs", auth: "Admin", description: "列出近期后台审计日志。" },
  { method: "POST", path: "/api/auth/send-code", auth: "Public", description: "认证验证码接口的兼容路径。" },
  { method: "POST", path: "/api/auth/register", auth: "Public", description: "注册接口的兼容路径。" },
  { method: "POST", path: "/api/auth/login", auth: "Public", description: "登录接口的兼容路径。" },
  { method: "GET", path: "/api/auth/me", auth: "Bearer", description: "当前用户接口的兼容路径。" }
];

const plannedRoutes: ApiDocItem[] = [
  { method: "POST", path: "/api/v1/auth/forgot-password", auth: "Public", description: "发送密码重置验证码。" },
  { method: "POST", path: "/api/v1/auth/reset-password", auth: "Public", description: "通过邮箱和验证码重置密码。" },
  { method: "GET", path: "/api/v1/users/me/profile", auth: "Bearer", description: "读取当前用户个人资料。" },
  { method: "PATCH", path: "/api/v1/users/me/profile", auth: "Bearer", description: "更新当前用户个人资料。" },
  { method: "GET", path: "/api/v1/users/me/favorites", auth: "Bearer", description: "列出当前用户收藏的资源。" },
  { method: "POST", path: "/api/v1/users/me/favorites/:resourceId", auth: "Bearer", description: "将资源加入收藏。" },
  { method: "DELETE", path: "/api/v1/users/me/favorites/:resourceId", auth: "Bearer", description: "从收藏中移除资源。" },
  { method: "GET", path: "/api/v1/submissions/:id", auth: "Bearer", description: "读取单个投稿，投稿者和管理员可访问。" },
  { method: "POST", path: "/api/v1/admin/resources", auth: "Admin", description: "后台直接创建资源。" },
  { method: "DELETE", path: "/api/v1/admin/resources/:id", auth: "Admin", description: "归档或删除资源。" },
  { method: "PATCH", path: "/api/v1/admin/tags/:id", auth: "Admin", description: "更新资源标签。" },
  { method: "DELETE", path: "/api/v1/admin/tags/:id", auth: "Admin", description: "删除资源标签。" },
  { method: "PATCH", path: "/api/v1/admin/roles/:id", auth: "Admin", description: "更新角色筛选选项。" },
  { method: "DELETE", path: "/api/v1/admin/roles/:id", auth: "Admin", description: "删除角色筛选选项。" },
  { method: "POST", path: "/api/v1/admin/users/:id/ban", auth: "Admin", description: "填写原因并封禁用户。" },
  { method: "GET", path: "/api/v1/admin/uploads", auth: "Admin", description: "列出上传文件，用于审核与清理。" }
];

const escapeHtml = (value: string) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

const renderRows = (items: ApiDocItem[]) =>
  items.map((item) => `<tr><td><span class="method">${escapeHtml(item.method)}</span></td><td><code>${escapeHtml(item.path)}</code></td><td>${escapeHtml(item.auth)}</td><td>${escapeHtml(item.description)}</td></tr>`).join("");

const renderDocs = () => `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Spire Card API Docs</title><style>
:root{color-scheme:light;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#153830;background:#f6fbf8}body{margin:0;padding:32px}main{max-width:1180px;margin:0 auto}h1{margin:0 0 8px;font-size:32px}h2{margin:32px 0 12px;font-size:22px}p{margin:0 0 18px;color:#52667a}table{width:100%;border-collapse:collapse;overflow:hidden;border:1px solid #d9e7e1;border-radius:10px;background:white}th,td{padding:12px 14px;border-bottom:1px solid #e7efeb;text-align:left;vertical-align:top;font-size:14px}th{background:#eaf5f0;color:#17483d;font-weight:800}tr:last-child td{border-bottom:0}code{font-family:"Cascadia Code","Consolas",monospace;color:#17483d}.method{display:inline-block;min-width:58px;border-radius:6px;background:#2f7664;color:white;padding:4px 8px;text-align:center;font-size:12px;font-weight:800}.meta{display:flex;gap:16px;flex-wrap:wrap;margin:18px 0 26px;color:#52667a}.meta span{border:1px solid #d9e7e1;border-radius:8px;background:white;padding:8px 10px}
</style></head><body><main><h1>Spire Card API Docs</h1><p>接口分为已实现与规划中两类。已实现接口可以直接测试；规划中接口只用于后续开发排期。</p><div class="meta"><span>基础路径: <code>/api/v1</code></span><span>已实现: ${implementedRoutes.length}</span><span>规划中: ${plannedRoutes.length}</span></div><h2>已实现接口</h2><table><thead><tr><th>方法</th><th>路径</th><th>权限</th><th>描述</th></tr></thead><tbody>${renderRows(implementedRoutes)}</tbody></table><h2>规划中接口</h2><table><thead><tr><th>方法</th><th>路径</th><th>权限</th><th>描述</th></tr></thead><tbody>${renderRows(plannedRoutes)}</tbody></table></main></body></html>`;

export async function docsRoutes(fastify: FastifyInstance) {
  fastify.get("/docs", async (_request, reply) => {
    return reply.type("text/html; charset=utf-8").send(renderDocs());
  });

  fastify.get("/api/v1/docs", async () => ({
    ok: true,
    data: {
      implemented: implementedRoutes,
      planned: plannedRoutes
    }
  }));
}
