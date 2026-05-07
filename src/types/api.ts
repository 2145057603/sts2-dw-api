export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "NOT_IMPLEMENTED"
  | "INTERNAL_SERVER_ERROR";

export type ApiError = {
  code: ApiErrorCode | string;
  message: string;
  fields?: Record<string, string>;
};

export type ApiSuccess<T> = {
  ok: true;
  data: T;
  message?: string;
};

export type ApiFailure = {
  ok: false;
  error: ApiError;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export type PageResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  role: "user" | "author" | "admin" | "superadmin";
  roles: string[];
  isAdmin: boolean;
  status: "active" | "disabled" | "banned";
  avatarUrl?: string | null;
  bio?: string | null;
  createdAt: string;
  updatedAt: string;
};
