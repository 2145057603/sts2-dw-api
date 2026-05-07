import { Resend } from "resend";
import { env } from "../config/env.js";
import { HttpError } from "../utils/http-error.js";

export type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export async function sendMail(input: SendMailInput) {
  if (env.MAIL_PROVIDER === "console") {
    console.info("[mail:console]", {
      to: input.to,
      subject: input.subject,
      text: input.text
    });
    return { provider: "console", id: null };
  }

  if (env.MAIL_PROVIDER === "resend") {
    if (!env.RESEND_API_KEY) throw new HttpError(500, "INTERNAL_SERVER_ERROR", "邮件服务未配置");
    const resend = new Resend(env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from: env.MAIL_FROM,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      ...(env.MAIL_REPLY_TO ? { replyTo: env.MAIL_REPLY_TO } : {})
    });
    if (result.error) throw new HttpError(502, "MAIL_SEND_FAILED", result.error.message);
    return { provider: "resend", id: result.data?.id ?? null };
  }

  throw new HttpError(500, "INTERNAL_SERVER_ERROR", "未知邮件服务");
}

export function renderVerificationMail(code: string) {
  const subject = "尖塔卡面美化站注册验证码";
  const text = `你的注册验证码是 ${code}，10 分钟内有效。请勿将验证码提供给他人。`;
  const html = `
    <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.7;color:#153830">
      <h1 style="font-size:22px;margin:0 0 12px">尖塔卡面美化站注册验证码</h1>
      <p>你的注册验证码是：</p>
      <p style="font-size:28px;font-weight:800;letter-spacing:4px;margin:16px 0;color:#2f7664">${code}</p>
      <p>验证码 10 分钟内有效。请勿将验证码提供给他人。</p>
    </div>
  `;
  return { subject, text, html };
}
