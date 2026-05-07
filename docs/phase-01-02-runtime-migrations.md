# Phase 1-2 Runtime And Migration Notes

## Local Runtime

1. Copy `.env.example` to `.env`.
2. Start PostgreSQL with `docker compose up -d postgres`.
3. Run `npm run prisma:deploy`.
4. Run `npm run dev`.
5. Check `GET http://localhost:4000/health`.
6. Check `GET http://localhost:4000/api/v1/health`.

## Production Runtime

Use environment variables instead of `.env` on Tencent Cloud CVM or any other cloud server. Run migrations with `npm run prisma:deploy` during release, then start the compiled service with `npm run start`.

## Migration Discipline

Development schema changes must produce Prisma migrations. Production must use deploy-time migrations only. Do not use development migration commands against production databases.
