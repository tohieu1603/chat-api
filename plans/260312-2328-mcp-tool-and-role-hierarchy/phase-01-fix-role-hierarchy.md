# Phase 1: Fix Role Hierarchy + Director Permissions

## Context Links
- Plan overview: [plan.md](./plan.md)
- Brainstorm: `plans/reports/brainstorm-260312-1738-mcp-create-user-tool.md`

## Overview
- **Priority:** P1 (blocker for all other phases)
- **Status:** complete
- **Effort:** 1h
- **Description:** Swap director/manager hierarchy levels, expand director CRUD permissions to manage manager+employee, restrict manager to employee-only.

## Key Insights
- Current bug: `DIRECTOR=2, MANAGER=3` — manager outranks director. Must be `DIRECTOR=3, MANAGER=2`.
- Current `MANAGER_ALLOWED_ROLES` includes `DIRECTOR` — wrong after fix since manager < director.
- Service layer already uses 2-tier logic (admin vs manager). Must expand to 3-tier (admin → director → manager).
- Route guard currently: `authorizeRoles(ADMIN, MANAGER)`. Must add `DIRECTOR`.

## Requirements

### Functional
- admin(4) > director(3) > manager(2) > employee(1)
- Director: CRUD manager + employee in same company
- Manager: CRUD employee only in same company
- Admin: unrestricted (existing behavior preserved)

### Non-functional
- Zero breaking changes to admin flow
- Company scoping enforced for director + manager

## Architecture
No new files. Modify existing constants, service, routes, seed.

## Related Code Files

| Action | File |
|--------|------|
| Modify | `src/constants/roles.constant.ts` |
| Modify | `src/services/admin-user.service.ts` |
| Modify | `src/routes/admin-user.routes.ts` |
| Modify | `src/seeds/admin-seed.ts` |

## Implementation Steps

### Step 1: Fix `src/constants/roles.constant.ts`

**Current code:**
```typescript
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.EMPLOYEE]: 1,
  [UserRole.DIRECTOR]: 2,
  [UserRole.MANAGER]: 3,
  [UserRole.ADMIN]: 4,
};
```

**New code:**
```typescript
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.EMPLOYEE]: 1,
  [UserRole.MANAGER]: 2,
  [UserRole.DIRECTOR]: 3,
  [UserRole.ADMIN]: 4,
};
```

### Step 2: Update `src/services/admin-user.service.ts`

#### 2a. Replace role constants at top of file

**Current:**
```typescript
// Roles a manager is allowed to assign (cannot create admin or other managers)
const MANAGER_ALLOWED_ROLES: UserRole[] = [UserRole.DIRECTOR, UserRole.EMPLOYEE];
```

**New:**
```typescript
// Director can manage manager + employee in same company
const DIRECTOR_ALLOWED_ROLES: UserRole[] = [UserRole.MANAGER, UserRole.EMPLOYEE];
// Manager can manage employee only in same company
const MANAGER_ALLOWED_ROLES: UserRole[] = [UserRole.EMPLOYEE];
```

#### 2b. Refactor `getAllUsers` — add director tier

**Current logic:** `if admin → all; else (manager) → company scoped`

**New logic:**
```typescript
async getAllUsers(
  page: number,
  limit: number,
  caller: JwtPayload,
  search?: string,
): Promise<{ data: UserResponseDto[]; total: number; page: number; limit: number }> {
  let users: any[];
  let total: number;

  if (caller.role === UserRole.ADMIN) {
    [users, total] = await userRepository.findAllPaginated(page, limit, search);
  } else {
    // Director + Manager: scoped to their company
    if (!caller.companyId) throw AppError.forbidden('Bạn chưa được gán vào công ty nào');
    [users, total] = await userRepository.findByCompanyPaginated(caller.companyId, page, limit, search);
  }

  return { data: users.map(UserResponseDto.fromEntity), total, page, limit };
}
```
Note: getAllUsers body barely changes — both director and manager see same-company users. The comment updates to reflect "Director + Manager".

#### 2c. Refactor `getUserById` — add director tier

Same pattern: director uses same company-scoped logic as manager. Update comment only.

#### 2d. Refactor `createUser` — 3-tier logic

**Current:** only checks `caller.role === UserRole.MANAGER`

**New code** (replace the manager restriction block):
```typescript
async createUser(dto: CreateUserDto, caller: JwtPayload): Promise<UserResponseDto> {
  const existing = await userRepository.findByEmail(dto.email);
  if (existing) throw AppError.conflict(AUTH_ERRORS.email_taken);

  // Director restrictions
  if (caller.role === UserRole.DIRECTOR) {
    if (!DIRECTOR_ALLOWED_ROLES.includes(dto.role)) {
      throw AppError.forbidden('Giám đốc chỉ có thể tạo tài khoản quản lý hoặc nhân viên');
    }
    if (!caller.companyId) throw AppError.forbidden('Bạn chưa được gán vào công ty nào');
    dto.companyId = caller.companyId;
  }

  // Manager restrictions
  if (caller.role === UserRole.MANAGER) {
    if (!MANAGER_ALLOWED_ROLES.includes(dto.role)) {
      throw AppError.forbidden('Quản lý chỉ có thể tạo tài khoản nhân viên');
    }
    if (!caller.companyId) throw AppError.forbidden('Bạn chưa được gán vào công ty nào');
    dto.companyId = caller.companyId;
  }

  const hashedPassword = await hashPassword(dto.password);
  const user = await userRepository.create({
    email: dto.email,
    password: hashedPassword,
    fullName: dto.fullName,
    role: dto.role,
    position: dto.position || null,
    companyId: dto.companyId || null,
    isActive: true,
  });

  return UserResponseDto.fromEntity(user);
}
```

#### 2e. Refactor `updateUser` — 3-tier logic

**New code** (replace the else block after admin check):
```typescript
async updateUser(id: string, dto: UpdateUserDto, caller: JwtPayload): Promise<UserResponseDto> {
  let user;

  if (caller.role === UserRole.ADMIN) {
    user = await userRepository.findById(id);
  } else {
    // Director + Manager: company scoped
    if (!caller.companyId) throw AppError.forbidden('Bạn chưa được gán vào công ty nào');
    user = await userRepository.findByIdAndCompany(id, caller.companyId);

    const allowedRoles = caller.role === UserRole.DIRECTOR
      ? DIRECTOR_ALLOWED_ROLES
      : MANAGER_ALLOWED_ROLES;

    // Cannot update user whose role is outside allowed scope
    if (user && !allowedRoles.includes(user.role)) {
      throw AppError.forbidden('Bạn không có quyền chỉnh sửa người dùng này');
    }

    // Cannot assign role outside allowed scope
    if (dto.role && !allowedRoles.includes(dto.role)) {
      throw AppError.forbidden('Bạn không có quyền gán vai trò này');
    }

    // Cannot move user to another company
    if (dto.companyId && dto.companyId !== caller.companyId) {
      throw AppError.forbidden('Bạn không thể chuyển nhân viên sang công ty khác');
    }
  }

  if (!user) throw AppError.notFound(USER_ERRORS.not_found);

  if (dto.email && dto.email !== user.email) {
    const existing = await userRepository.findByEmail(dto.email);
    if (existing) throw AppError.conflict(AUTH_ERRORS.email_taken);
    user.email = dto.email;
  }

  if (dto.fullName !== undefined) user.fullName = dto.fullName;
  if (dto.role !== undefined) user.role = dto.role;
  if (dto.isActive !== undefined) user.isActive = dto.isActive;
  if (dto.position !== undefined) user.position = dto.position;
  if (dto.companyId !== undefined && caller.role === UserRole.ADMIN) user.companyId = dto.companyId;

  const saved = await userRepository.save(user);
  return UserResponseDto.fromEntity(saved);
}
```

Key addition: check that the **target user's current role** is within the caller's allowed scope before allowing edit. Prevents director from editing admin, manager from editing director.

#### 2f. Refactor `deleteUser` — 3-tier logic

**New code** (replace the manager-specific check):
```typescript
async deleteUser(id: string, caller: JwtPayload): Promise<void> {
  if (id === caller.userId) {
    throw AppError.badRequest(USER_ERRORS.cannot_delete_self);
  }

  let user;
  if (caller.role === UserRole.ADMIN) {
    user = await userRepository.findById(id);
  } else {
    if (!caller.companyId) throw AppError.forbidden('Bạn chưa được gán vào công ty nào');
    user = await userRepository.findByIdAndCompany(id, caller.companyId);
  }

  if (!user) throw AppError.notFound(USER_ERRORS.not_found);

  // Director/Manager: can only delete users within allowed roles
  if (caller.role !== UserRole.ADMIN) {
    const allowedRoles = caller.role === UserRole.DIRECTOR
      ? DIRECTOR_ALLOWED_ROLES
      : MANAGER_ALLOWED_ROLES;
    if (!allowedRoles.includes(user.role)) {
      throw AppError.forbidden('Bạn không có quyền xoá người dùng này');
    }
  }

  await userRepository.softDelete(id);
}
```

### Step 3: Update `src/routes/admin-user.routes.ts`

**Current:**
```typescript
const guard = [authenticateToken, authorizeRoles(UserRole.ADMIN, UserRole.MANAGER)];
```

**New:**
```typescript
const guard = [authenticateToken, authorizeRoles(UserRole.ADMIN, UserRole.DIRECTOR, UserRole.MANAGER)];
```

Update swagger comments: `Admin + Director + Manager can manage users (scoped by role in service layer)`

### Step 4: Update `src/seeds/admin-seed.ts`

Swap director/manager positions to reflect correct hierarchy:

**Current seed data issue:** Director has position "Giám đốc kinh doanh" but is level 2 (below manager). After fix, director is level 3 — positions already match semantically. Only update the comment.

**Change the `seedUsers` array comment:**
```typescript
// Seed users: admin (no company), directors + managers + employees per company
const seedUsers = [
  // Admin - no company
  { email: 'admin@gmail.com', password: 'admin123', fullName: 'System Admin', role: UserRole.ADMIN, position: 'System Administrator', company: null },
  // Company A: director + manager + employees
  { email: 'b@gmail.com', password: 'b123456789', fullName: 'Director B', role: UserRole.DIRECTOR, position: 'Giám đốc Company A', company: 'Company A' },
  { email: 'a@gmail.com', password: 'a123456789', fullName: 'Manager A', role: UserRole.MANAGER, position: 'Quản lý Company A', company: 'Company A' },
  { email: 'c@gmail.com', password: 'c123456789', fullName: 'User C', role: UserRole.EMPLOYEE, position: 'Nhân viên kỹ thuật', company: 'Company A' },
  // Company B: director + manager + employees
  { email: 'e@gmail.com', password: 'e123456789', fullName: 'Director E', role: UserRole.DIRECTOR, position: 'Giám đốc Company B', company: 'Company B' },
  { email: 'd@gmail.com', password: 'd123456789', fullName: 'Manager D', role: UserRole.MANAGER, position: 'Quản lý Company B', company: 'Company B' },
];
```

Director listed before manager in each company to reflect hierarchy.

## Todo List
- [ ] Swap DIRECTOR/MANAGER levels in `roles.constant.ts`
- [ ] Add `DIRECTOR_ALLOWED_ROLES` constant in `admin-user.service.ts`
- [ ] Update `MANAGER_ALLOWED_ROLES` to `[EMPLOYEE]` only
- [ ] Refactor `createUser` with 3-tier logic
- [ ] Refactor `updateUser` with 3-tier logic + target role check
- [ ] Refactor `deleteUser` with 3-tier logic
- [ ] Update `getAllUsers` and `getUserById` comments
- [ ] Add `DIRECTOR` to route guard in `admin-user.routes.ts`
- [ ] Update seed data ordering and names
- [ ] Compile check: `npx tsc --noEmit`

## Success Criteria
- `ROLE_HIERARCHY` shows employee(1) < manager(2) < director(3) < admin(4)
- Director can create/update/delete manager+employee in same company
- Manager can create/update/delete employee only in same company
- Manager cannot create/edit/delete director or admin
- Director cannot create/edit/delete admin
- Admin behavior unchanged
- No TypeScript compilation errors

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| Existing DB users have wrong hierarchy assumptions | Low | Hierarchy is code-only, not stored in DB |
| Seed re-run on existing DB | Low | Seed checks `findOne` before creating |

## Security Considerations
- Company scoping enforced: director/manager CANNOT access cross-company users
- Target role validation: director can't edit admin, manager can't edit director
- Self-delete prevention preserved

## Next Steps
→ Phase 2: Add `must_change_password` + `created_by` fields, change-password endpoint
