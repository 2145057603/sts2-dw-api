import type { ApiSuccess } from "../types/api.js";

export const ok = <T>(data: T, message?: string): ApiSuccess<T> => ({
  ok: true,
  data,
  ...(message ? { message } : {})
});
