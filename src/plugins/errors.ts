import fp from "fastify-plugin";
import type { FastifyError } from "fastify";

export type ApiErrorBody = {
  ok: false;
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
};

export const errorsPlugin = fp(async (fastify) => {
  fastify.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error(error);
    const statusCode = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;
    const code = error.code || (statusCode === 500 ? "INTERNAL_SERVER_ERROR" : "REQUEST_ERROR");
    const message = statusCode === 500 ? "服务器内部错误" : error.message;

    const body: ApiErrorBody = {
      ok: false,
      error: {
        code,
        message,
        ...("fields" in error && error.fields ? { fields: error.fields as Record<string, string> } : {})
      }
    };

    void reply.status(statusCode).send(body);
  });
});
