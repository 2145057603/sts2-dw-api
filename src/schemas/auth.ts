import { z } from "zod";

export const sendCodeSchema = z.object({
  email: z.string().email()
});

export const registerSchema = z.object({
  email: z.string().email(),
  code: z.string().min(4).max(12),
  name: z.string().min(2).max(40),
  password: z.string().min(6).max(128)
});

export const loginSchema = z.object({
  account: z.string().min(1).max(120),
  password: z.string().min(6).max(128),
  remember: z.union([z.literal("on"), z.boolean()]).optional()
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(20)
});

export type SendCodeInput = z.infer<typeof sendCodeSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
