# Phase 2: User Entity Update

## Context Links
- [Plan overview](./plan.md)
- [user.entity.ts](../../src/entities/user.entity.ts)
- [user.dto.ts](../../src/dtos/user.dto.ts)
- [admin-user.service.ts](../../src/services/admin-user.service.ts)
- [base.entity.ts](../../src/entities/base.entity.ts)

## Overview
- **Priority:** High (blocks Phase 3 + 4)
- **Status:** Pending
- **Description:** Add `must_change_password` boolean column to User entity; update DTOs to expose it

## Key Insights
- TypeORM `synchronize: true` in dev auto-creates the column; production needs migration
- Column defaults to `false` so existing users unaffected
- `UserResponseDto.fromEntity()` is the single mapping point; update once, all endpoints reflect it
- `CreateUserDto` already has `password` field; MCP tool will supply env default password + set `mustChangePassword: true`
- `adminUserService.createUser()` calls `userRepository.create()` with `Partial<User>` - adding `mustChangePassword` field is backwards-compatible

## Requirements

**Functional:**
- User entity gains `must_change_password` column (boolean, default false)
- UserResponseDto includes `mustChangePassword` field
- CreateUserDto gets optional `mustChangePassword` boolean (admin can control it)
- adminUserService.createUser() passes `mustChangePassword` through to repository

**Non-functional:**
- Zero-downtime: default false means no breaking change for existing rows
- TypeORM auto-sync handles dev; production migration documented

## Architecture

```
User Entity                    UserResponseDto
┌─────────────────────┐       ┌─────────────────────┐
│ ...existing fields   │       │ ...existing fields   │
│ + mustChangePassword │──────▶│ + mustChangePassword │
│   (bool, def false)  │       │   (boolean)          │
└─────────────────────┘       └─────────────────────┘
```

## Related Code Files

**Modify:**
- `src/entities/user.entity.ts` - add column
- `src/dtos/user.dto.ts` - update UserResponseDto.fromEntity(), add field to CreateUserDto
- `src/services/admin-user.service.ts` - pass mustChangePassword in create()

## Implementation Steps

### 1. Update `src/entities/user.entity.ts`

Add after `companyId` column (line ~27):
```typescript
@Column({ name: 'must_change_password', default: false })
mustChangePassword!: boolean;
```

### 2. Update `src/dtos/user.dto.ts`

**2a. Add to CreateUserDto** (after `companyId` field, line ~29):
```typescript
@IsOptional()
@IsBoolean()
mustChangePassword?: boolean;
```

Import `IsBoolean` - already imported on line 1.

**2b. Add to UserResponseDto** (after `companyId` field, line ~68):
```typescript
mustChangePassword!: boolean;
```

**2c. Update `UserResponseDto.fromEntity()`** (inside the method, after line ~80):
```typescript
dto.mustChangePassword = user.mustChangePassword ?? false;
```

### 3. Update `src/services/admin-user.service.ts`

In `createUser()` method, update the `userRepository.create()` call (line ~74):
```typescript
const user = await userRepository.create({
  email: dto.email,
  password: hashedPassword,
  fullName: dto.fullName,
  role: dto.role,
  position: dto.position || null,
  companyId: dto.companyId || null,
  isActive: true,
  mustChangePassword: dto.mustChangePassword ?? false,
});
```

### 4. Verify compilation
```bash
npx tsc --noEmit
```

## Todo List
- [ ] Add `mustChangePassword` column to User entity
- [ ] Add `mustChangePassword` to CreateUserDto (optional boolean)
- [ ] Add `mustChangePassword` to UserResponseDto + fromEntity()
- [ ] Update adminUserService.createUser() to pass mustChangePassword
- [ ] Verify `npx tsc --noEmit` passes
- [ ] Verify dev server starts (TypeORM auto-sync creates column)

## Success Criteria
- User entity has `must_change_password` column in DB
- `GET /api/auth/profile` response includes `mustChangePassword: false` for existing users
- `POST /api/admin/users` with `mustChangePassword: true` creates user with flag set
- All existing endpoints continue working (no breaking changes)

## Risk Assessment
| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Migration needed for production | Medium | Document ALTER TABLE; TypeORM handles dev |
| Existing tests break | Low | No tests currently in project |

## Security Considerations
- `mustChangePassword` defaults to false; only set true via admin/MCP tool
- Flag is informational for frontend; actual password enforcement in Phase 3

## Next Steps
- Phase 3: Auth Change Password (uses mustChangePassword in login flow)
- Phase 4: MCP Server Integration (sets mustChangePassword: true on create)
