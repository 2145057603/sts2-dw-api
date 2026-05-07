import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().url(),
  CORS_ORIGIN: z.string().default("http://localhost:4321"),
  PUBLIC_BASE_URL: z.string().url().default("http://localhost:4000"),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  UPLOAD_DRIVER: z.enum(["local", "cos", "s3"]).default("local"),
  UPLOAD_DIR: z.string().default("uploads"),
  MAIL_PROVIDER: z.enum(["console", "resend"]).default("console"),
  MAIL_FROM: z.string().default("Spire Card API <onboarding@resend.dev>"),
  MAIL_REPLY_TO: z.string().email().optional(),
  RESEND_API_KEY: z.string().optional()
});

export type AppEnv = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);

export const corsOrigins = env.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean);
