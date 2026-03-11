# Phase 05: Admin User Management

**Status:** pending
**Dependencies:** Phase 04

## Context Links
- [Plan Overview](./plan.md)
- [Phase 04](./phase-04-auth-module.md)

## Overview
Admin-only CRUD endpoints for user management. All routes protected by auth middleware + admin role guard. Includes IDOR prevention.

## Key Insights
- All routes require ADMIN role
- Admin can create users with any role
- Admin can soft-delete users
- IDOR prevention: admin role verified at middleware level, no resource ownership ambiguity
- Pagination for user listing

## Requirements
- List users with pagination + filtering
- Get single user by ID
- Create user with specified role
- Update user (including role change, password reset)
- Soft delete user
- Admin cannot delete themselves

## Architecture
```
src/
├── services/
│   └── admin-user.service.ts
├── controllers/
│   └── admin-user.controller.ts
└── routes/
    └── admin.routes.ts
```

## Implementation Steps

### 1. Admin User Service
- `findAll(page, limit, filters?)`:
  1. Query users with pagination
  2. Optional filters: role, isActive, search (email/fullName)
  3. Return paginated response with UserResponseDto array

- `findById(id)`:
  1. Find user by UUID
  2. Throw 404 if not found
  3. Return UserResponseDto

- `create(createUserDto)`:
  1. Check email uniqueness
  2. Hash password
  3. Create user with specified role
  4. Return UserResponseDto

- `update(id, updateUserDto)`:
  1. Find user, throw 404 if not found
  2. If email changed, check uniqueness
  3. If password provided, hash it
  4. Update user
  5. Return UserResponseDto

- `softDelete(id, adminId)`:
  1. Prevent self-deletion (id !== adminId)
  2. Find user, throw 404 if not found
  3. Soft delete (sets deletedAt)
  4. Return success

### 2. Admin User Controller
- `GET /` -> findAll with query params (page, limit, role, isActive, search)
- `GET /:id` -> findById with UUID param validation
- `POST /` -> create with CreateUserDto validation
- `PUT /:id` -> update with UpdateUserDto validation
- `DELETE /:id` -> softDelete

### 3. Admin Routes
```
const router = Router()
router.use(authMiddleware, roleGuard(UserRole.ADMIN))
router.get('/', adminUserController.findAll)
router.get('/:id', adminUserController.findById)
router.post('/', validationMiddleware(CreateUserDto), adminUserController.create)
router.put('/:id', validationMiddleware(UpdateUserDto), adminUserController.update)
router.delete('/:id', adminUserController.softDelete)
```
Mount at `/api/admin/users`

## Todo List
- [ ] admin-user.service.ts
- [ ] admin-user.controller.ts
- [ ] admin.routes.ts
- [ ] Mount admin routes in app.ts
- [ ] Add query param DTOs for filtering/pagination

## Success Criteria
- Only admin role can access all endpoints
- Non-admin gets 403
- CRUD operations work correctly
- Pagination returns correct totals
- Soft delete sets deletedAt, user excluded from normal queries
- Admin cannot delete themselves
- Email uniqueness enforced on create/update
- Passwords hashed on create/update

## Risk Assessment
- **Low**: Pagination edge cases (page beyond total) - return empty array
- **Low**: UUID param validation - invalid UUID should return 400

## Security Considerations
- All routes behind admin role guard - IDOR not possible (admin has full access by design)
- Password always hashed before storage
- Self-deletion prevented
- Soft delete preserves audit trail
- Password never returned in responses

## Next Steps
-> Phase 06: Middleware & Security
