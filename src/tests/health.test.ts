import test from "node:test";
import assert from "node:assert/strict";

test("GET /health returns ok envelope", async () => {
  process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/spire_card_api?schema=public";
  process.env.JWT_ACCESS_SECRET ??= "test-access-secret-with-at-least-32-characters";
  process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-with-at-least-32-characters";
  const { buildApp } = await import("../app.js");
  const app = await buildApp({ skipPrisma: true });
  const response = await app.inject({ method: "GET", url: "/health" });
  assert.equal(response.statusCode, 200);
  const body = response.json();
  assert.equal(body.ok, true);
  assert.equal(body.data.status, "ok");
  await app.close();
});
