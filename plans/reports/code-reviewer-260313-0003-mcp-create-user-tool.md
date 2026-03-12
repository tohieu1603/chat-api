# Code Review: MCP Create User Tool + Role Hierarchy Refactor

**Date:** 260313
**Branch:** Hung
**Reviewer:** code-reviewer agent

---

## Scope

| File | Change |
|------|--------|
| `src/constants/roles.constant.ts` | Swapped DIRECTOR/MANAGER levels |
| `src/services/admin-user.service.ts` | 3-tier CRUD: admin > director > manager |
| `src/routes/admin-user.routes.ts` | Added DIRECTOR to guard |
| `src/seeds/admin-seed.ts` | Updated seed ordering |
| `src/entities/user.entity.ts` | Added `must_change_password`, `created_by` |
| `src/dtos/user.dto.ts` | Updated CreateUserDto + UserResponseDto |
| `src/dtos/auth.dto.ts` | Added ChangePasswordDto |
| `src/repositories/user.repository.ts` | Added `findByIdWithPassword` |
| `src/constants/error-messages.constant.ts` | Added wrong_password, same_password |
| `src/services/auth.service.ts` | Added `changePassword` method |
| `src/controllers/auth.controller.ts` | Added `changePassword` handler |
| `src/routes/auth.routes.ts` | Added POST /change-password |
| `src/config/env.config.ts` | Added `defaultUserPassword` |
| `.env.example` | Added DEFAULT_USER_PASSWORD |
| `src/utils/email-generator.util.ts` | NEW: email auto-gen with diacritics removal |
| `src/mcp/mcp-router.ts` | NEW: stateless MCP HTTP endpoint |
| `src/mcp/tools/role-list.tool.ts` | NEW: `list_roles` tool |
| `src/mcp/tools/user-account.tool.ts` | NEW: `create_user_account` tool |
| `src/app.ts` | Mounted /mcp route |

**Build:** PASS (tsc --noEmit clean, npm run build clean)
**Type coverage:** Strict mode enabled, no type errors
**Tests:** No test suite present

---

## Overall Assessment

The implementation is well-structured and follows existing patterns. Role hierarchy swap is correct and consistently enforced across service, routes, and seed data. The MCP stateless pattern is sound. Several issues found — one critical (MCP mounted without rate-limiting), two high-priority (caller-supplied `createdBy` in REST DTO, `getAllUsers` returns all company users including peers), and several medium items.

---

## Critical Issues

### C1 - MCP endpoint has no rate limiting

**File:** `src/app.ts:51`

```ts
app.use('/mcp', mcpRouter);
```

Every other sensitive route uses `express-rate-limit` (already in deps). The `/mcp` route is missing it. An authenticated ADMIN can flood the endpoint — each request spins up a new `McpServer` + `StreamableHTTPServerTransport` instance, which is CPU and memory intensive.

**Fix:** Add rate limiter to the MCP router or at mount point:

```ts
import rateLimit from 'express-rate-limit';

const mcpLimiter = rateLimit({ windowMs: 60_000, max: 30, standardHeaders: true, legacyHeaders: false });
app.use('/mcp', mcpLimiter, mcpRouter);
```

---

## High Priority

### H1 - REST CreateUserDto allows caller to set `createdBy` — privilege escalation risk

**File:** `src/dtos/user.dto.ts:35-37`, `src/services/admin-user.service.ts:95`

```ts
// DTO
@IsOptional()
@IsUUID('4', { message: 'Mã người tạo không hợp lệ' })
createdBy?: string;

// Service — blindly trusts dto.createdBy
createdBy: dto.createdBy || null,
```

A DIRECTOR or MANAGER calling `POST /api/admin/users` can supply any UUID as `createdBy`, falsely attributing account creation to another user (e.g., an admin). The service should always derive this from the JWT caller.

**Fix in `admin-user.service.ts` `createUser`:**

```ts
const user = await userRepository.create({
  ...
  createdBy: caller.userId,   // always from JWT, never from dto
  isActive: true,
});
```

Remove `createdBy` from `CreateUserDto` entirely (it has no legitimate client-supplied use).

---

### H2 - Director/Manager `getAllUsers` leaks peers (same company)

**File:** `src/services/admin-user.service.ts:38-42`

```ts
} else {
  // Director + Manager: scoped to their company
  if (!caller.companyId) throw AppError.forbidden(...);
  [users, total] = await userRepository.findByCompanyPaginated(caller.companyId, page, limit, search);
}
```

`findByCompanyPaginated` returns ALL users in the company, including users whose roles are outside the caller's `getAllowedRoles`. A MANAGER can now see DIRECTOR accounts — consistent with the READ scope of `getUserById`, but inconsistent with the write-scope enforcement (a manager cannot update/delete a director). This is an intentional UX trade-off but undocumented. If the intent is that managers should NOT see directors, filter by `allowedRoles` in the query or at the response layer.

**Recommendation:** Document the intentional asymmetry (can read all, can write only allowed roles), or add role-filter to listing for consistency.

---

### H3 - `changePassword` does not invalidate existing refresh tokens

**File:** `src/services/auth.service.ts:142-155`

```ts
async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  ...
  user.password = await hashPassword(newPassword);
  user.mustChangePassword = false;
  await userRepository.save(user);
  // No token revocation
}
```

After a password change, all previously issued refresh tokens remain valid. If a session was stolen (which is exactly the `mustChangePassword` scenario), the attacker retains access via the existing refresh token until it expires (up to 7 days).

**Fix:**

```ts
user.password = await hashPassword(newPassword);
user.mustChangePassword = false;
await userRepository.save(user);
await refreshTokenRepository.revokeAllByUserId(userId, 'password_change');
```

---

## Medium Priority

### M1 - Duplicate comment in `roles.constant.ts`

**File:** `src/constants/roles.constant.ts:8-9`

```ts
// Role hierarchy: higher number = more privilege
// Role hierarchy: higher number = more privilege   <-- duplicate line
// director (giám đốc) outranks manager (quản lý)
```

Remove the repeated line.

---

### M2 - `updateUser` role-check order: checks user role BEFORE `notFound`

**File:** `src/services/admin-user.service.ts:120-135`

```ts
// Cannot update user whose role is outside allowed scope
if (user && !allowedRoles.includes(user.role)) {
  throw AppError.forbidden(...);
}
// ...
if (!user) throw AppError.notFound(USER_ERRORS.not_found);
```

When `user` is `null` (not found in the company), the role-scope check is skipped (because of the `user &&` guard), then `notFound` is thrown. This is safe but the pattern is fragile — a future developer adding logic after the `user &&` guard may miss the null case. Better to fail-fast:

```ts
if (!user) throw AppError.notFound(USER_ERRORS.not_found);

const allowedRoles = getAllowedRoles(caller.role);
if (!allowedRoles.includes(user.role)) {
  throw AppError.forbidden('Bạn không có quyền chỉnh sửa người dùng này');
}
```

---

### M3 - `email-generator.util.ts`: empty fullName or companyName produces broken email

**File:** `src/utils/email-generator.util.ts:43-45`

```ts
const localPart = normalizeToSlug(fullName);   // could be ""
const domain = normalizeToDomain(companyName); // could be ""
const baseEmail = `${localPart}@${domain}.com`;
```

If `fullName` is all non-ASCII unsupported characters after diacritics removal, `localPart` is `""`. Result: `@domain.com` — an invalid email that bypasses the Zod `.email()` check in the tool (which only validates if the caller supplies email). Similarly an empty `companyName` → `localPart@.com`.

**Fix:** Add guard after normalization:

```ts
const localPart = normalizeToSlug(fullName);
if (!localPart) throw new Error(`Không thể tạo email slug từ tên: "${fullName}"`);
const domain = normalizeToDomain(companyName);
if (!domain) throw new Error(`Không thể tạo email domain từ tên công ty: "${companyName}"`);
```

---

### M4 - `user-account.tool.ts`: TOCTOU email uniqueness race

**File:** `src/mcp/tools/user-account.tool.ts:68-85`

```ts
email = await generateEmail(params.fullName, company.name, async (candidate) => {
  const existing = await userRepository.findByEmail(candidate);
  return existing !== null;
});

// Check email uniqueness (again)
const existing = await userRepository.findByEmail(email);
if (existing) { ... }
```

The double-check is good. However, between the two checks, concurrent requests for the same name can both pass both checks and then race to insert — resulting in a DB unique constraint violation. The `userRepository.create` will throw a DB error which is caught by the outer `catch (error: any)` and returned as a generic `Lỗi: ...error.message`. This is acceptable but the error message exposed could be a raw DB constraint string. Consider detecting the unique violation and returning a friendlier message.

---

### M5 - MCP route mounted outside `/api` prefix — inconsistent path

**File:** `src/app.ts:51`

```ts
app.use('/mcp', mcpRouter);  // outside /api/*
```

All other routes use `/api/*`. This means the `/mcp` path bypasses any future `/api`-level middleware (rate limiting, logging, request size limits applied to `/api/*`). Recommend mounting at `/api/mcp` for consistency and to benefit from any future `/api` middleware.

---

### M6 - Default password exposed in `.env.example` as plaintext

**File:** `.env.example`

```
DEFAULT_USER_PASSWORD=Welcome@123
```

The example value `Welcome@123` is a real-looking default that operators may leave unchanged in production. Add a comment warning:

```
# CHANGE THIS before deploying to production. Used as initial password for MCP-created users.
DEFAULT_USER_PASSWORD=ChangeMe@InProd
```

---

### M7 - `getAllowedRoles` returns `[]` for EMPLOYEE — silent no-op in role checks

**File:** `src/services/admin-user.service.ts:15-18`

```ts
function getAllowedRoles(callerRole: UserRole): UserRole[] {
  if (callerRole === UserRole.DIRECTOR) return DIRECTOR_ALLOWED_ROLES;
  if (callerRole === UserRole.MANAGER) return MANAGER_ALLOWED_ROLES;
  return [];   // EMPLOYEE or unknown role
}
```

The route guard only admits ADMIN, DIRECTOR, MANAGER, so an EMPLOYEE will never reach this code. However, `getAllowedRoles` returning `[]` for EMPLOYEE would cause `allowedRoles.includes(anything)` to be `false`, which means `deleteUser` would throw forbidden — the right outcome, but for the wrong reason. Consider adding `UserRole.ADMIN` to the early return or adding an explicit default branch comment.

---

## Low Priority

### L1 - Seed passwords are weak and hardcoded

**File:** `src/seeds/admin-seed.ts:39-46`

```ts
{ email: 'admin@gmail.com', password: 'admin123', ... }
{ email: 'b@gmail.com', password: 'b123456789', ... }
```

Seed files are only for development but these should at minimum use the `DEFAULT_USER_PASSWORD` env var or a dedicated `SEED_PASSWORD` var to avoid devs accidentally using weak credentials on staging environments.

---

### L2 - `login` does not check `mustChangePassword` — no enforcement at auth boundary

**File:** `src/services/auth.service.ts:79-97`

Users with `mustChangePassword = true` can log in and receive tokens without any hint they must change their password. The field is set but the auth flow doesn't gate or signal it in the login response. At minimum, include `mustChangePassword` in the login response payload so the frontend can redirect to the change-password screen.

`UserResponseDto.fromEntity` already includes `mustChangePassword`, and `login` returns `user: UserResponseDto.fromEntity(user)` — so the field IS in the response. This is fine. Just ensure the frontend uses it. (Informational note, not a code bug.)

---

## Edge Cases Found by Scout

| Edge Case | Location | Severity |
|-----------|----------|----------|
| Empty fullName/companyName after accent removal → invalid email | `email-generator.util.ts` | Medium (M3) |
| Concurrent MCP `create_user` → TOCTOU race on email uniqueness | `user-account.tool.ts` | Medium (M4) |
| Stolen session + `mustChangePassword` flow → refresh token still valid after password change | `auth.service.ts` | High (H3) |
| Director calling `getAllUsers` sees own-level peers | `admin-user.service.ts` | High (H2) |
| `createdBy` supplied by untrusted client in REST DTO | `user.dto.ts` + `admin-user.service.ts` | High (H1) |

---

## Positive Observations

- Stateless MCP pattern is correctly implemented — fresh `McpServer` + `StreamableHTTPServerTransport` per request, no shared mutable state, `res.on('close')` cleanup.
- `findByIdWithPassword` uses `addSelect` on a `select: false` column — correct approach, no accidental password exposure in normal queries.
- `changePassword` double-hashes for same-password detection (`comparePassword(newPassword, user.password)`) before writing — good UX guard.
- `getAllowedRoles` helper is clean, DRY, and correctly centralises role-scope logic.
- `email-generator.util.ts` handles diacritics removal and suffix collision loop with a reasonable ceiling (100 attempts) and a thrown error fallback.
- `authorizeRoles(UserRole.ADMIN)` on MCP router correctly restricts to ADMIN-only.
- `onDelete: 'SET NULL'` on `created_by` FK is appropriate — avoids cascade deletion when an admin is removed.
- Build is clean; TypeScript strict mode passes with no errors.

---

## Recommended Actions (Prioritized)

1. **[Critical]** Add rate limiting to `/mcp` mount point (C1)
2. **[High]** Remove `createdBy` from `CreateUserDto`; derive from `caller.userId` in service (H1)
3. **[High]** Revoke all refresh tokens on `changePassword` (H3)
4. **[High]** Document or fix `getAllUsers` peer-visibility asymmetry (H2)
5. **[Medium]** Guard empty slug/domain in `email-generator.util.ts` (M3)
6. **[Medium]** Remove duplicate comment in `roles.constant.ts` (M1)
7. **[Medium]** Reorder null-check before role-scope check in `updateUser` (M2)
8. **[Medium]** Move MCP mount to `/api/mcp` (M5)
9. **[Medium]** Add warning comment to DEFAULT_USER_PASSWORD in `.env.example` (M6)
10. **[Low]** Seed users should use env-var passwords (L1)

---

## Metrics

| Metric | Value |
|--------|-------|
| TypeScript strict | PASS |
| Build | PASS |
| Linting | No ESLint config in project |
| Tests | No test suite |
| New files | 3 (mcp-router, role-list.tool, user-account.tool, email-generator.util) |
| Files modified | 15 |

---

## Unresolved Questions

1. Is the `getAllUsers` peer-visibility for DIRECTOR/MANAGER intentional (read-all, write-scoped)? If yes, add a comment in the service to prevent future "bug" fixes that break it.
2. Should `mustChangePassword` block access to other endpoints (e.g., profile update) until satisfied, or is change-password purely advisory?
3. Is there a plan to add MCP GET/DELETE handlers, or is POST-only final? `StreamableHTTPServerTransport` supports GET for SSE — should those be guarded or disabled explicitly?
4. The MCP tool description is Vietnamese-only — is this intentional for LLM prompts directed at Vietnamese models, or should descriptions be bilingual?
