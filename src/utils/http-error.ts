import type { ApiErrorCode } from "../types/api.js";

export class HttpError extends Error {
  public readonly statusCode: number;
  public readonly code: ApiErrorCode | string;
  public readonly fields?: Record<string, string>;

  constructor(statusCode: number, code: ApiErrorCode | string, message: string, fields?: Record<string, string>) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields;
  }
}

export const validationError = (message: string, fields?: Record<string, string>) =>
  new HttpError(400, "VALIDATION_ERROR", message, fields);
