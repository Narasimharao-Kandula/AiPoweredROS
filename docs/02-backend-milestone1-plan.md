# Milestone 1: Backend Foundation

## Goal

Authentication + User Management + Menu Management

## Prisma Models (5)

```
User       — id, name, email, phone, password, role (enum), isActive, createdAt, updatedAt
Category   — id, name, description, isActive, createdAt, updatedAt
MenuItem   — id, name, description, price, categoryId (FK), imageUrl, isAvailable, createdAt, updatedAt
Order      — id, orderNumber, userId (FK), status (enum), totalAmount, createdAt, updatedAt
OrderItem  — id, orderId (FK), menuItemId (FK), quantity, unitPrice, createdAt
```

## Modules (3)

| Module | Endpoints | Access |
|--------|-----------|--------|
| Auth | POST /auth/register, POST /auth/login, GET /auth/me | Public (except /me) |
| Users | GET, GET/:id, PATCH/:id, DELETE/:id | MANAGER only |
| Menu | CRUD categories + CRUD items | MANAGER for writes, all for reads |

## Tech Stack Versions

- NestJS (latest stable)
- Prisma (latest)
- PostgreSQL 16
- Redis 7
- pnpm workspace monorepo
- JWT + Passport for auth
- Swagger at /api
- Pino for logging

## Build Order

1. Config files (pnpm, ts, docker, env, nest-cli)
2. Prisma schema + service
3. Common layer (guards, decorators)
4. Auth module
5. Users module
6. Menu module
7. main.ts wiring (swagger, pino, cors, validation)
8. Verify with docker compose + pnpm start:dev

## Ports

| Service | Port |
|---------|------|
| Frontend | 3000 |
| Backend | 4000 |
| PostgreSQL | 5432 |
| Redis | 6379 |
| Swagger | 4000/api |
