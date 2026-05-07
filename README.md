# Spire Card API

Node.js + Fastify + TypeScript + Prisma + PostgreSQL backend for the card MOD resource site.

## Scripts

- `npm run dev`: start the development server.
- `npm run build`: compile TypeScript.
- `npm run start`: run the compiled server.
- `npm run prisma:generate`: generate Prisma client.
- `npm run prisma:migrate`: create and apply a local migration.
- `npm run prisma:deploy`: apply migrations in production.

## Deployment

The service is stateless and reads production settings from environment variables. It is designed for Tencent Cloud CVM with TencentDB for PostgreSQL, and also works on other Linux cloud servers or Docker hosts.
