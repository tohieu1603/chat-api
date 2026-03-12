# Phase 3: Auth Flow - Change Password

## Context Links
- [Plan overview](./plan.md)
- [auth.service.ts](../../src/services/auth.service.ts)
- [auth.controller.ts](../../src/controllers/auth.controller.ts)
- [auth.routes.ts](../../src/routes/auth.routes.ts)
- [auth.dto.ts](../../src/dtos/auth.dto.ts)
- [password.util.ts](../../src/utils/password.util.ts)
- [user.repository.ts](../../src/repositories/user.repository.ts)
- [error-messages.constant.ts](../../src/constants/error-messages.constant.ts)

## Overview
- **Priority:** Medium
- **Status:** Pending
- **Description:** Add change-password endpoint; include `mustChangePassword` flag in login response so frontend can redirect user to change password on first login

## Key Insights
- Login already returns `UserResponseDto` which (after Phase 2) includes `mustChangePassword`
- No need to block login; frontend checks flag and redirects
- Change-password requires auth (user must be logged in)
- After password change, set `mustChangePassword = false` on user
- Follow existing patterns: DTO class-validator, service method, controller handler, route

## Requirements

**Functional:**
- `POST /api/auth/change-password` endpoint (authenticated)
- Request: `{ currentPassword, newPassword }`
- Validates current password matches
- Updates password hash + sets `mustChangePassword = false`
- Login response already includes `mustChangePassword` (via UserResponseDto from Phase 2)

**Non-functional:**
- Password min 8 chars (match existing validation)
- Must not allow same password as current

## Architecture

```
POST /api/auth/change-password
    │ authenticateToken
    ▼
AuthController.changePassword()
    │
    ▼
AuthService.changePassword(userId, currentPassword, newPassword)
    │ 1. Fetch user with password (findByEmail or new findByIdWithPassword)
    │ 2. Verify currentPassword matches
    │ 3. Hash newPassword
    │ 4. Update user.password + user.mustChangePassword = false
    │ 5. Revoke all refresh tokens (force re-login for security)
    ▼
responseUtil.success(res, null, 'Đổi mật khẩu thành công')
```

## Related Code Files

**Create:**
- None (all changes go into existing files)

**Modify:**
- `src/dtos/auth.dto.ts` - add ChangePasswordDto
- `src/services/auth.service.ts` - add changePassword()
- `src/controllers/auth.controller.ts` - add changePassword handler
- `src/routes/auth.routes.ts` - add POST /change-password route
- `src/repositories/user.repository.ts` - add findByIdWithPassword()
- `src/constants/error-messages.constant.ts` - add password error messages

## Implementation Steps

### 1. Add error messages to `src/constants/error-messages.constant.ts`

Add to `AUTH_ERRORS` object:
```typescript
password_incorrect: 'Mật khẩu hiện tại không đúng',
password_same: 'Mật khẩu mới không được trùng mật khẩu hiện tại',
```

### 2. Add `findByIdWithPassword` to `src/repositories/user.repository.ts`

After `findById()` method (line ~21):
```typescript
async findByIdWithPassword(id: string): Promise<User | null> {
  return this.repository
    .createQueryBuilder('user')
    .addSelect('user.password')
    .where('user.id = :id', { id })
    .getOne();
}
```

Pattern matches existing `findByEmail()` which also uses `addSelect('user.password')`.

### 3. Add `ChangePasswordDto` to `src/dtos/auth.dto.ts`

After `LoginDto` class (line ~24):
```typescript
export class ChangePasswordDto {
  @IsString()
  @MinLength(1, { message: 'Vui lòng nhập mật khẩu hiện tại' })
  currentPassword!: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu mới phải có ít nhất 8 ký tự' })
  @MaxLength(100)
  newPassword!: string;
}
```

### 4. Add `changePassword()` to `src/services/auth.service.ts`

After `getProfile()` method (line ~148):
```typescript
async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  const user = await userRepository.findByIdWithPassword(userId);
  if (!user) {
    throw AppError.notFound(USER_ERRORS.not_found);
  }

  const isMatch = await comparePassword(currentPassword, user.password);
  if (!isMatch) {
    throw AppError.badRequest(AUTH_ERRORS.password_incorrect);
  }

  const isSame = await comparePassword(newPassword, user.password);
  if (isSame) {
    throw AppError.badRequest(AUTH_ERRORS.password_same);
  }

  user.password = await hashPassword(newPassword);
  user.mustChangePassword = false;
  await userRepository.save(user);

  // Revoke all refresh tokens (force re-login on all devices)
  await refreshTokenRepository.revokeAllByUserId(userId, 'password_change');
}
```

Add `ChangePasswordDto` to imports if needed (not strictly needed since we use raw params).

### 5. Add `changePassword` handler to `src/controllers/auth.controller.ts`

Import ChangePasswordDto:
```typescript
import { RegisterDto, LoginDto, ChangePasswordDto } from '../dtos/auth.dto';
```

After `getProfile()` method (line ~70):
```typescript
async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = req.body as ChangePasswordDto;
    await authService.changePassword(req.user!.userId, dto.currentPassword, dto.newPassword);
    cookieUtil.clearTokens(res);
    responseUtil.success(res, null, 'Đổi mật khẩu thành công');
  } catch (err) {
    next(err);
  }
}
```

Note: `cookieUtil.clearTokens(res)` clears cookies since all refresh tokens revoked; user must re-login.

### 6. Add route to `src/routes/auth.routes.ts`

Import ChangePasswordDto:
```typescript
import { RegisterDto, LoginDto, ChangePasswordDto } from '../dtos/auth.dto';
```

Before the `/logout` route (after line ~70):
```typescript
/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Change password
 *     description: Change current user password. Revokes all sessions.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password changed, all sessions revoked
 *       400:
 *         description: Current password incorrect or same password
 *       401:
 *         description: Not authenticated
 */
router.post('/change-password', authenticateToken, validateDto(ChangePasswordDto), (req, res, next) => authController.changePassword(req, res, next));
```

### 7. Verify compilation
```bash
npx tsc --noEmit
```

## Todo List
- [ ] Add error messages to error-messages.constant.ts
- [ ] Add findByIdWithPassword() to user.repository.ts
- [ ] Add ChangePasswordDto to auth.dto.ts
- [ ] Add changePassword() to auth.service.ts
- [ ] Add changePassword handler to auth.controller.ts
- [ ] Add POST /change-password route to auth.routes.ts (with Swagger)
- [ ] Verify `npx tsc --noEmit` passes
- [ ] Manual test: login with must_change_password user, verify flag in response
- [ ] Manual test: POST /change-password, verify password updated + sessions revoked

## Success Criteria
- `POST /api/auth/change-password` works with valid current + new password
- Returns 400 if current password wrong
- Returns 400 if new password same as current
- After change: mustChangePassword = false on user
- After change: all refresh tokens revoked (user logged out everywhere)
- Login response includes `mustChangePassword` field

## Risk Assessment
| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Forgetting to revoke tokens | Low | Explicitly call revokeAllByUserId |
| Password select issue | Low | New findByIdWithPassword follows existing findByEmail pattern |

## Security Considerations
- Password validated via bcrypt compare (existing pattern)
- All sessions revoked on password change (defense against stolen tokens)
- Cookies cleared on response (force re-login in current browser)
- Rate limiting inherited from Express rate-limiter middleware

## Next Steps
- Phase 4 can proceed independently (does not depend on this phase)
- After Phase 4: end-to-end test of MCP create user -> login -> change password flow
