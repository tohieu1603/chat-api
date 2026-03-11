# Phase 02: Base Infrastructure & Common Utils

**Status:** completed
**Dependencies:** Phase 01

## Context Links
- [Plan Overview](./plan.md)
- [Phase 01](./phase-01-project-setup.md)

## Overview
Create reusable base classes (entity, repository, service, controller), constants, utility helpers, interfaces, and common response format. Foundation for all feature modules.

## Key Insights
- Base classes use generics for type safety
- Constants centralized to avoid magic strings
- Response format standardized across all endpoints
- JWT helper encapsulates sign/verify logic

## Requirements
- Generic base classes usable by all modules
- Consistent API response structure: `{ success, message, data, errors? }`
- Paginated response support

## Architecture
```
src/
├── constants/
│   ├── roles.enum.ts         # ADMIN, DIRECTOR, EMPLOYEE
│   ├── error-messages.ts     # Centralized error strings
│   └── http-status.ts        # HTTP status code constants
├── interfaces/
│   ├── jwt-payload.interface.ts
│   ├── api-response.interface.ts
│   └── paginated-response.interface.ts
├── utils/
│   ├── password.util.ts      # bcrypt hash/compare
│   ├── jwt.util.ts           # sign/verify access+refresh
│   └── response.util.ts      # Success/error response builders
├── entities/
│   └── base.entity.ts        # id(UUID), createdAt, updatedAt, deletedAt
├── repositories/
│   └── base.repository.ts    # Generic CRUD wrapper around TypeORM
├── services/
│   └── base.service.ts       # Generic service using base repo
└── controllers/
    └── base.controller.ts    # Common response handling
```

## Related Code Files
All files listed in Architecture section above.

## Implementation Steps

### 1. Constants
- `roles.enum.ts`: enum `UserRole { ADMIN, DIRECTOR, EMPLOYEE }`
- `error-messages.ts`: object with keys like `USER_NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_ERROR`, `EMAIL_EXISTS`
- `http-status.ts`: export common codes (200, 201, 400, 401, 403, 404, 409, 500)

### 2. Interfaces
- `api-response.interface.ts`: `{ success: boolean; message: string; data?: T; errors?: any }`
- `paginated-response.interface.ts`: extends api-response with `{ total, page, limit, totalPages }`
- `jwt-payload.interface.ts`: `{ userId: string; email: string; role: UserRole }`

### 3. Utils
- `password.util.ts`: `hashPassword(plain)` -> hashed, `comparePassword(plain, hashed)` -> boolean. bcrypt salt rounds = 10
- `jwt.util.ts`: `generateAccessToken(payload)`, `generateRefreshToken(payload)`, `verifyAccessToken(token)`, `verifyRefreshToken(token)`. Use env config for secrets/expiry
- `response.util.ts`: `successResponse(res, data, message, status)`, `errorResponse(res, message, status, errors?)`, `paginatedResponse(res, data, total, page, limit)`

### 4. Base Entity
- `base.entity.ts`: abstract class with `@PrimaryGeneratedColumn('uuid') id`, `@CreateDateColumn() createdAt`, `@UpdateDateColumn() updatedAt`, `@DeleteDateColumn() deletedAt`

### 5. Base Repository
- `base.repository.ts`: generic class wrapping TypeORM Repository
- Methods: `findAll(options?)`, `findById(id)`, `findOne(where)`, `create(data)`, `update(id, data)`, `softDelete(id)`, `count(where?)`
- Accept TypeORM FindOptions for flexibility

### 6. Base Service
- `base.service.ts`: generic class using base repository
- Methods mirror repository but add business logic hooks
- `findAllPaginated(page, limit, where?)` for pagination

### 7. Base Controller
- `base.controller.ts`: helper methods `sendSuccess`, `sendError`, `sendPaginated`
- Wraps response util calls

## Todo List
- [x] Constants: roles enum, error messages (roles.constant.ts, error-messages.constant.ts)
- [x] Interfaces: api-response, paginated-response, jwt-payload
- [x] password.util.ts
- [x] jwt.util.ts
- [x] response.util.ts
- [x] base.entity.ts
- [x] cookie.util.ts
- [x] app-error.util.ts
- [ ] base.repository.ts (deferred to Phase 03)
- [ ] base.service.ts (deferred to Phase 03)
- [ ] base.controller.ts (deferred to Phase 03)

## Success Criteria
- Base entity compiles with TypeORM decorators
- JWT util generates valid tokens, verifies correctly
- Password util hashes and compares successfully
- Base classes are generic and type-safe
- Response format consistent across all helpers

## Risk Assessment
- **Low**: Generic type constraints may need refinement during usage
- **Medium**: Base repository pattern must not over-abstract TypeORM - keep it thin

## Security Considerations
- bcrypt salt rounds >= 10
- JWT secrets must be strong (env vars)
- Password util never logs plaintext passwords
- Response util strips sensitive fields

## Next Steps
-> Phase 03: User Entity & Repository
