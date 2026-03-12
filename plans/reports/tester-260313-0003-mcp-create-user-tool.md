# QA Report: MCP Create User Tool & Auth Changes
**Date:** 2026-03-13
**Branch:** Hung
**Scope:** Role hierarchy fix, 3-tier CRUD permissions, User entity columns, change-password endpoint, MCP stateless server, email-generator util

---

## Test Results Overview

| Check | Status | Notes |
|---|---|---|
| `npx tsc --noEmit` | PASS | Zero errors, zero warnings |
| `npm run build` | PASS | `rimraf dist && tsc` — clean output |
| Unit/Integration tests | N/A | No test suite configured (`test` script = `exit 1`) |
| New files exist | PASS | All 4 files confirmed |
| Dist output | PASS | All new `.js` files emitted to `dist/` |

---

## File Verification

All 4 required files present and correctly structured:

| File | Status | Lines |
|---|---|---|
| `src/mcp/mcp-router.ts` | EXISTS | 59 |
| `src/mcp/tools/user-account.tool.ts` | EXISTS | 119 |
| `src/mcp/tools/role-list.tool.ts` | EXISTS | 49 |
| `src/utils/email-generator.util.ts` | EXISTS | 63 |

Corresponding dist outputs confirmed:
- `dist/mcp/mcp-router.js`
- `dist/mcp/tools/user-account.tool.js`
- `dist/mcp/tools/role-list.tool.js`
- `dist/utils/email-generator.util.js`

---

## Build Status

**PASS** — `npm run build` succeeded with no output errors or warnings.
TypeScript `5.9.3` strict compile passed cleanly on all 57 source files.

---

## Implementation Verification

### 1. Role Hierarchy Fix (`src/constants/roles.constant.ts`)
- `EMPLOYEE=1`, `MANAGER=2`, `DIRECTOR=3`, `ADMIN=4` — correct order, director > manager.
- Duplicate comment line (line 8-9) — cosmetic only, no functional impact.

### 2. 3-Tier CRUD Permissions (`src/services/admin-user.service.ts`)
- `DIRECTOR_ALLOWED_ROLES = [MANAGER, EMPLOYEE]` — can create/update/delete manager + employee.
- `MANAGER_ALLOWED_ROLES = [EMPLOYEE]` — can only manage employee.
- `ADMIN` — unrestricted, cross-company.
- Self-delete guard present on `deleteUser`.
- Company isolation enforced for director/manager on all CRUD ops.

### 3. User Entity (`src/entities/user.entity.ts`)
- `must_change_password` column: `@Column({ name: 'must_change_password', default: false })` — present.
- `created_by` column: `@Column({ name: 'created_by', type: 'uuid', nullable: true })` — present.
- Self-referencing `@ManyToOne(() => User)` for `creator` relation — correct.

### 4. Auth: `POST /api/auth/change-password`
- Route registered in `src/routes/auth.routes.ts` line 140 with `authenticateToken` + `validateDto(ChangePasswordDto)`.
- `authService.changePassword()` sets `mustChangePassword = false` after success.
- Controller at `src/controllers/auth.controller.ts` line 63.

### 5. MCP Stateless Server (`POST /mcp`)
- Registered in `src/app.ts` line 51: `app.use('/mcp', mcpRouter)`.
- Guard: `authenticateToken + authorizeRoles(UserRole.ADMIN)` — admin-only.
- Fresh `McpServer` + `StreamableHTTPServerTransport` per request — correctly stateless.
- `sessionIdGenerator: undefined` + `enableJsonResponse: true` — appropriate for stateless mode.
- Two tools registered: `create_user_account`, `list_roles`.
- Error handling: catches thrown errors, returns JSON-RPC 2.0 error if headers not yet sent.

### 6. Email Generator (`src/utils/email-generator.util.ts`)
- Uses `remove-accents` package (listed in `dependencies`) — correct.
- `normalizeToSlug`: removes Vietnamese diacritics, lowercases, replaces spaces with `.`, strips non-alphanumeric.
- `normalizeToDomain`: strips all non-alphanumeric for domain part.
- Duplicate suffix loop: tries `name2@domain.com` → `name100@domain.com`, throws after 100 collisions.
- `emailExists` callback injected — testable without DB.

---

## Coverage Metrics

**No test suite exists.** Zero automated coverage.
Coverage: **0%** (line, branch, function).

---

## Performance Metrics

- `tsc --noEmit`: ~3s (57 files, no issues)
- `npm run build`: ~3s (full compile + rimraf)
- No slow test detection applicable.

---

## Critical Issues

None blocking. Build and types are clean.

---

## Recommendations

1. **Add Jest test suite** — project has no tests at all. Minimum viable coverage:
   - `generateEmail()` unit tests (pure function, easy to test without DB):
     - Vietnamese name normalization
     - Company domain normalization
     - Duplicate suffix increment
     - Error after 100 collisions
   - `AdminUserService` unit tests with mocked `userRepository`:
     - Director cannot create `admin`/`director`
     - Manager cannot create `manager`/`director`/`admin`
     - Self-delete guard
     - Company isolation
   - `ROLE_HIERARCHY` values test (regression guard for future reordering)
2. **Add TypeORM migration** for `must_change_password` and `created_by` columns — these are new DB columns, existing deployments need a migration to avoid runtime errors.
3. **MCP tool: `create_user_account`** — role enum is hardcoded as `['director', 'manager', 'employee']` (line 24, `user-account.tool.ts`). If roles change, this needs updating. Consider deriving from `UserRole` enum.
4. **Duplicate comment** in `roles.constant.ts` lines 8-9 — minor, safe to remove.

---

## Next Steps (Prioritized)

1. Run DB migration for new User columns before deploying.
2. Install Jest + `ts-jest` and add `src/utils/email-generator.util.test.ts` (highest ROI, pure function).
3. Add `AdminUserService` permission boundary tests.
4. Add integration smoke test for `POST /mcp` endpoint (requires DB).

---

## Unresolved Questions

1. Is there a TypeORM migration file for `must_change_password` + `created_by`? Not found in `src/` — if `synchronize: true` is used in dev this is fine, but prod requires explicit migration.
2. `envConfig.defaultUserPassword` — used in `create_user_account` MCP tool. Is this env var documented and set in all environments?
3. MCP endpoint is admin-only — is there a plan to support director-level MCP access in the future?
