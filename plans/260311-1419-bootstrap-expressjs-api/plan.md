# Bootstrap Express.js TypeScript Chat Channel API

## Overview
Express.js + TypeScript + PostgreSQL + TypeORM API with JWT auth, role-based access (admin/director/employee), admin user management, Swagger docs, and security hardening.

## Architecture
Controller -> Router -> Service -> Repository (OOP with base classes)

## Tech Stack
Express.js, TypeScript, TypeORM, PostgreSQL, JWT (access+refresh), bcrypt, class-validator, Swagger

## Phases

| # | Phase | Status | File | Dependencies |
|---|-------|--------|------|-------------|
| 01 | Project Setup & Configuration | done | [phase-01](./phase-01-project-setup.md) | none |
| 02 | Base Infrastructure & Common Utils | done | [phase-02](./phase-02-base-infrastructure.md) | Phase 01 |
| 03 | User Entity & Repository | done | [phase-03](./phase-03-user-entity.md) | Phase 02 |
| 04 | Auth Module | done | [phase-04](./phase-04-auth-module.md) | Phase 03 |
| 05 | Admin User Management | done | [phase-05](./phase-05-admin-management.md) | Phase 04 |
| 06 | Middleware & Security | done | [phase-06](./phase-06-middleware-security.md) | Phase 01 (parallel w/ 04-05) |
| 07 | Swagger & Documentation | done | [phase-07](./phase-07-swagger-docs.md) | Phase 04, 05 |
| 08 | Final Integration & Testing | done | [phase-08](./phase-08-integration-testing.md) | All |

## Key Decisions
- UUID primary keys for all entities
- Soft delete via TypeORM `DeleteDateColumn`
- Refresh tokens stored hashed in DB
- Short-lived access tokens (15m), long-lived refresh (7d)
- class-validator + class-transformer for DTO validation
- Base classes (entity, repository, service, controller) for DRY

## Entity: User
id (UUID), email, password, fullName, role (ADMIN/DIRECTOR/EMPLOYEE), isActive, refreshToken, createdAt, updatedAt, deletedAt

## API Surface
- `/api/auth/*` - register, login, logout, refresh, profile
- `/api/admin/users/*` - CRUD users (admin-only)
