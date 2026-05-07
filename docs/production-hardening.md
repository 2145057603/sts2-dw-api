# Production Hardening

## Required Controls

- Use strong `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` values.
- Restrict `CORS_ORIGIN` to known frontend origins.
- Run PostgreSQL outside the API container.
- Use `npm run prisma:deploy` during releases.
- Put HTTPS at Nginx, Tencent Cloud Load Balancer, or another proxy.
- Send service logs to stdout for cloud log collection.
- Back up PostgreSQL on a fixed schedule.
- Keep `/health` for liveness and `/ready` for database readiness.

## Limits

The API uses Fastify rate limiting globally. Login, registration, and verification-code routes should receive stricter per-route limits before public launch.
