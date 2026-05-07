# Tencent Cloud Deployment

## Recommended Topology

- Tencent Cloud CVM runs Docker.
- TencentDB for PostgreSQL stores production data.
- Nginx or Tencent Cloud Load Balancer terminates HTTPS.
- The API container listens on `PORT`, default `4000`.

## Release Steps

1. Build the Docker image.
2. Provide production environment variables.
3. Run `npm run prisma:deploy`.
4. Start the API container.
5. Check `/health`.
6. Check `/ready`.

## Port And Proxy

Expose the API only to the reverse proxy when possible. Public traffic should reach the service through HTTPS on the proxy, then forward to the container's internal HTTP port.
