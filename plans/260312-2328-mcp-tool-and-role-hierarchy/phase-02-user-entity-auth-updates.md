# Phase 2: User Entity + Auth Updates

## Context Links
- Plan overview: [plan.md](./plan.md)
- Phase 1 (prerequisite): [phase-01](./phase-01-fix-role-hierarchy.md)
- Brainstorm: `plans/reports/brainstorm-260312-1738-mcp-create-user-tool.md`

## Overview
- **Priority:** P1
- **Status:** complete
- **Effort:** 1.5h
- **Description:** Add `must_change_password` and `created_by` columns to User entity, update DTOs, add change-password endpoint, include `mustChangePassword` in login response.

## Key Insights
- `must_change_password` enables forcing password change on first login for MCP-created accounts
- `created_by` is self-referencing FK to `users.id` — tracks who created the account (admin/director/manager or MCP caller)
- Login response currently returns `UserResponseDto` which maps from entity — adding field to entity + DTO propagates automatically
- Existing `hashPassword` + `comparePassword` utils reused for change-password flow
- `UserResponseDto.fromEntity` pattern must include new fields

## Requirements

### Functional
- User entity gains `must_change_password` (boolean, default false) and `created_by` (uuid, nullable)
- Login response includes `mustChangePassword` field
- `POST /api/auth/change-password` — any authenticated user can change their password
- After password change, `must_change_password` set to false
- `ChangePasswordDto`: `currentPassword` (required, min 8), `newPassword` (required, min 8)

### Non-functional
- TypeORM migration auto-generates via `synchronize: true` in dev (existing pattern)
- No breaking changes to existing login/register flow

## Architecture
```
AuthController.changePassword(req)
  → AuthService.changePassword(userId, dto)
    → userRepository.findByEmail (with password select)
    → comparePassword(dto.currentPassword, user.password)
    → hashPassword(dto.newPassword)
    → user.password = hashed; user.mustChangePassword = false
    → userRepository.save(user)
```

## Related Code Files

| Action | File |
|--------|------|
| Modify | `src/entities/user.entity.ts` |
| Modify | `src/dtos/user.dto.ts` |
| Modify | `src/dtos/auth.dto.ts` |
| Modify | `src/services/auth.service.ts` |
| Modify | `src/services/admin-user.service.ts` |
| Modify | `src/controllers/auth.controller.ts` |
| Modify | `src/routes/auth.routes.ts` |
| Modify | `src/repositories/user.repository.ts` |
| Modify | `src/constants/error-messages.constant.ts` |

## Implementation Steps

### Step 1: Update `src/entities/user.entity.ts`

Add two columns after the `companyId`/`company` block:

```typescript
@Column({ name: 'must_change_password', default: false })
mustChangePassword!: boolean;

@Column({ name: 'created_by', type: 'uuid', nullable: true })
createdBy?: string | null;

@ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
@JoinColumn({ name: 'created_by' })
creator?: User | null;
```

Full updated entity (imports add `User` self-reference — already imported implicitly via class name):
```typescript
import { Entity, Column, BeforeInsert, BeforeUpdate, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { UserRole } from '../constants/roles.constant';
import { Company } from './company.entity';

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  email!: string;

  @Column({ select: false })
  password!: string;

  @Column({ name: 'full_name' })
  fullName!: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.EMPLOYEE })
  role!: UserRole;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  position?: string | null;

  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId?: string | null;

  @ManyToOne(() => Company, (company) => company.users, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'company_id' })
  company?: Company | null;

  @Column({ name: 'must_change_password', default: false })
  mustChangePassword!: boolean;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  creator?: User | null;

  @BeforeInsert()
  @BeforeUpdate()
  normalizeEmail(): void {
    if (this.email) {
      this.email = this.email.toLowerCase().trim();
    }
  }
}
```

### Step 2: Update `src/dtos/user.dto.ts`

#### 2a. Add fields to `CreateUserDto`

Add optional fields (used by admin-user.service when creating via MCP or admin panel):
```typescript
@IsOptional()
@IsBoolean()
mustChangePassword?: boolean;

@IsOptional()
@IsUUID('4', { message: 'Mã người tạo không hợp lệ' })
createdBy?: string;
```

#### 2b. Update `UserResponseDto`

Add fields to class + `fromEntity`:
```typescript
export class UserResponseDto {
  id!: string;
  email!: string;
  fullName!: string;
  role!: UserRole;
  isActive!: boolean;
  position?: string | null;
  companyId?: string | null;
  mustChangePassword!: boolean;
  createdBy?: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  static fromEntity(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.fullName = user.fullName;
    dto.role = user.role;
    dto.isActive = user.isActive;
    dto.position = user.position ?? null;
    dto.companyId = user.companyId ?? null;
    dto.mustChangePassword = user.mustChangePassword ?? false;
    dto.createdBy = user.createdBy ?? null;
    dto.createdAt = user.createdAt;
    dto.updatedAt = user.updatedAt;
    return dto;
  }
}
```

### Step 3: Add `ChangePasswordDto` to `src/dtos/auth.dto.ts`

Append after `LoginDto`:
```typescript
export class ChangePasswordDto {
  @IsString()
  @MinLength(8, { message: 'Mật khẩu hiện tại phải có ít nhất 8 ký tự' })
  @MaxLength(100)
  currentPassword!: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu mới phải có ít nhất 8 ký tự' })
  @MaxLength(100)
  newPassword!: string;
}
```

### Step 4: Add `findByIdWithPassword` to `src/repositories/user.repository.ts`

Need a method that returns user WITH password selected (for password verification):
```typescript
async findByIdWithPassword(id: string): Promise<User | null> {
  return this.repository
    .createQueryBuilder('user')
    .addSelect('user.password')
    .where('user.id = :id', { id })
    .getOne();
}
```

### Step 5: Add error messages to `src/constants/error-messages.constant.ts`

Add to `AUTH_ERRORS`:
```typescript
wrong_password: 'Mật khẩu hiện tại không đúng',
same_password: 'Mật khẩu mới phải khác mật khẩu hiện tại',
```

### Step 6: Add `changePassword` to `src/services/auth.service.ts`

Add method to `AuthService` class:
```typescript
async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  const user = await userRepository.findByIdWithPassword(userId);
  if (!user) throw AppError.notFound(USER_ERRORS.not_found);

  const isMatch = await comparePassword(currentPassword, user.password);
  if (!isMatch) throw AppError.badRequest(AUTH_ERRORS.wrong_password);

  // Prevent setting same password
  const isSame = await comparePassword(newPassword, user.password);
  if (isSame) throw AppError.badRequest(AUTH_ERRORS.same_password);

  user.password = await hashPassword(newPassword);
  user.mustChangePassword = false;
  await userRepository.save(user);
}
```

### Step 7: Add `changePassword` handler to `src/controllers/auth.controller.ts`

Add method to `AuthController` class:
```typescript
async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body as ChangePasswordDto;
    await authService.changePassword(req.user!.userId, currentPassword, newPassword);
    responseUtil.success(res, null, 'Đổi mật khẩu thành công');
  } catch (err) {
    next(err);
  }
}
```

Update import at top of file:
```typescript
import { RegisterDto, LoginDto, ChangePasswordDto } from '../dtos/auth.dto';
```

### Step 8: Add route to `src/routes/auth.routes.ts`

Add after `/logout` route, before `/profile`:
```typescript
/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Change password
 *     description: Changes authenticated user's password. Sets mustChangePassword to false.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePasswordDto'
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Wrong current password or validation error
 *       401:
 *         description: Not authenticated
 */
router.post('/change-password', authenticateToken, validateDto(ChangePasswordDto), (req, res, next) => authController.changePassword(req, res, next));
```

Update import:
```typescript
import { RegisterDto, LoginDto, ChangePasswordDto } from '../dtos/auth.dto';
```

### Step 9: Update `createUser` in `src/services/admin-user.service.ts`

Pass `mustChangePassword` and `createdBy` when creating user:
```typescript
const user = await userRepository.create({
  email: dto.email,
  password: hashedPassword,
  fullName: dto.fullName,
  role: dto.role,
  position: dto.position || null,
  companyId: dto.companyId || null,
  mustChangePassword: dto.mustChangePassword || false,
  createdBy: dto.createdBy || null,
  isActive: true,
});
```

### Step 10: Login response auto-includes `mustChangePassword`

No explicit change needed — `UserResponseDto.fromEntity` already updated in Step 2b. The login method returns `UserResponseDto.fromEntity(user)` which now includes `mustChangePassword`. The field will be `false` for existing users (column default).

## Todo List
- [ ] Add `must_change_password` column to User entity
- [ ] Add `created_by` column + self-referencing relation to User entity
- [ ] Update `CreateUserDto` with optional `mustChangePassword` + `createdBy`
- [ ] Update `UserResponseDto` with `mustChangePassword` + `createdBy` fields
- [ ] Add `ChangePasswordDto` to `auth.dto.ts`
- [ ] Add `findByIdWithPassword` to `user.repository.ts`
- [ ] Add error messages (`wrong_password`, `same_password`) to constants
- [ ] Add `changePassword` method to `AuthService`
- [ ] Add `changePassword` handler to `AuthController`
- [ ] Add `POST /api/auth/change-password` route with swagger docs
- [ ] Update `createUser` in admin-user.service to pass new fields
- [ ] Compile check: `npx tsc --noEmit`

## Success Criteria
- User table has `must_change_password` (default false) and `created_by` (nullable uuid) columns
- Login response JSON includes `mustChangePassword` field
- `POST /api/auth/change-password` works for authenticated users
- After changing password, `mustChangePassword` becomes false
- Wrong current password returns 400 error
- Same password as current returns 400 error
- No compilation errors

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| Existing users lack `must_change_password` | None | Column default is `false` |
| Existing users lack `created_by` | None | Column is nullable |
| `findByIdWithPassword` could be misused | Low | Only called from `changePassword` |
| Self-referencing FK on same table | Low | TypeORM handles this; `onDelete: SET NULL` |

## Security Considerations
- Password verification required before allowing change (prevents unauthorized changes even with stolen token)
- Same-password check prevents trivial "change" to satisfy flag
- `password` column remains `select: false` — only explicitly queried in `findByEmail` and new `findByIdWithPassword`
- `createdBy` is audit trail only — no authorization logic depends on it

## Next Steps
→ Phase 3: Install MCP deps, add `DEFAULT_USER_PASSWORD` env config, create email generation util
