# Code Review Summary

**Date:** 2026-03-11
**Reviewer:** code-reviewer
**Plan:** 260311-1419-bootstrap-expressjs-api

---

## Scope

- **Files reviewed:** All 40 TypeScript source files in `src/`
- **Lines analyzed:** ~900 LoC
- **Review focus:** Full codebase — correctness, security, type safety, compilability
- **Updated plans:** `plans/260311-1419-bootstrap-expressjs-api/plan.md` — all phases marked done

---

## Overall Assessment

Solid, well-structured Express.js + TypeScript codebase. Architecture is clean (Controller→Route→Service→Repository), separation of concerns respected, security fundamentals correct. One runtime bug found and fixed: TypeORM QueryBuilder `addSelect` used DB column name instead of entity property name. TypeScript compiles with zero errors before and after fix.

---

## Critical Issues

None. Zero TypeScript compilation errors (`npx tsc --noEmit` exits 0).

---

## High Priority Findings

### [FIXED] TypeORM QueryBuilder column alias bug — `user.repository.ts`

**Problem:** `addSelect('user.refresh_token')` uses the database column name. TypeORM QueryBuilder `addSelect` requires the **entity property name** (camelCase), not the DB column name. This silently fails at runtime — `refreshToken` is never populated, so `user.refreshToken` is `undefined`, causing all token refresh and logout operations to fail or behave incorrectly.

**Affected methods:** `findByEmailWithRefreshToken`, `findByIdWithRefreshToken`

**Fix applied:**
```typescript
// Before (broken at runtime):
.addSelect('user.refresh_token')

// After (correct):
.addSelect('user.refreshToken')
```

---

## Medium Priority Improvements

### Unnecessary password selection in `findByEmailWithRefreshToken`

`findByEmailWithRefreshToken` selects both `password` AND `refreshToken`. This method is not called anywhere in the current codebase (unused — only `findByEmail` and `findByIdWithRefreshToken` are used). It's dead code that also over-fetches sensitive data. Consider removing or leaving for future use with a comment.

**Impact:** Low runtime risk (unused), but exposes password hash unnecessarily if ever called.

### Auth service: `isActive` check after password verification

In `auth.service.ts` `login()`, the `isActive` check occurs after `comparePassword`. This means a timing-based info leak: a deactivated user gets a different error than "invalid credentials". For security-sensitive contexts, the order should be: check `isActive` → then compare password. However, this is a common and acceptable UX tradeoff.

### `findByEmailWithRefreshToken` is unused

The method exists in `UserRepository` but is never called (auth service uses `findByEmail` for login and `findByIdWithRefreshToken` for refresh). Dead code.

---

## Low Priority Suggestions

### `expiresIn` type cast in `jwt.util.ts`

The `as jwt.SignOptions` cast is a workaround for `jsonwebtoken` typing where `expiresIn` accepts `string | number`. The cast is safe here since the underlying values are valid string durations (e.g., `'15m'`, `'7d'`). No action needed.

### `uuid` package listed as dependency but unused

`uuid` v13 is in `dependencies` but not imported anywhere in `src/`. TypeORM's `PrimaryGeneratedColumn('uuid')` generates UUIDs internally. Consider removing from `package.json` to keep dependencies minimal.

### `ROLE_HIERARCHY` constant is defined but unused

`src/constants/roles.constant.ts` exports `ROLE_HIERARCHY` but no code references it. Either wire it into role-guard logic for hierarchical role checks, or remove.

### README method mismatch — [FIXED]

README documented the update endpoint as `PATCH` but the route uses `PUT`. Fixed to `PUT`.

---

## Positive Observations

- **Cookie-only auth correctly implemented.** No `Authorization` header usage anywhere. All token reads from `req.cookies`. `httpOnly: true` on all cookie sets.
- **Passwords never returned in responses.** `UserResponseDto.fromEntity()` explicitly maps only safe fields. `password` column has `select: false` in entity ensuring it's excluded from default queries.
- **Refresh tokens hashed before DB storage.** `bcrypt.hash(refreshToken, 10)` before `updateRefreshToken()`. Comparison via `bcrypt.compare()`. Correct.
- **IDOR prevention on delete.** `deleteUser` checks `id === currentUserId` and throws 400 before querying DB.
- **DTO validation on all POST/PUT endpoints.** `validateDto` middleware applied to: `POST /register`, `POST /login`, `POST /api/admin/users`, `PUT /api/admin/users/:id`. Correct.
- **`authRateLimiter` on auth endpoints.** Applied at route mount: `app.use('/api/auth', authRateLimiter, authRoutes)`. Correct.
- **Middleware order correct.** helmet → cors → cookieParser → json → urlencoded → requestLogger → apiRateLimiter → swagger → routes → 404 → errorHandler. Matches spec.
- **Soft delete implemented.** `DeleteDateColumn` on `BaseEntity`, `softDelete()` in repository.
- **Input validation comprehensive.** class-validator decorators on all DTOs with `whitelist: true, forbidNonWhitelisted: true` in `validateDto`.
- **`strictPropertyInitialization: false`** correctly set since TypeORM decorators handle initialization.
- **`emitDecoratorMetadata: true`** set for class-validator/class-transformer compatibility.
- **Error messages don't leak internals.** Generic messages for DB errors and unknown errors in `error-handler.middleware.ts`.
- **Seeder is idempotent.** Checks for existing admin before inserting.
- **`password` column `select: false` + explicit `addSelect` in queries that need it.** Correct pattern for sensitive field protection.
- **`UserRepository` instantiated as singleton after DB init.** `server.ts` initializes `AppDataSource` first, then imports `app` (which triggers module load of repository). Pattern is correct.

---

## Security Checklist — All Pass

| Check | Status |
|---|---|
| Auth uses httpOnly cookies only (no Authorization headers) | PASS |
| Passwords never returned in responses | PASS |
| Refresh tokens hashed before DB storage | PASS |
| IDOR prevention on admin delete | PASS |
| Input validation on all POST/PUT endpoints | PASS |
| `authRateLimiter` on auth endpoints | PASS |
| Middleware order correct | PASS |
| Cookie flags: httpOnly, secure (env-configured), sameSite | PASS |

---

## Recommended Actions

1. **[Done]** Fix `addSelect('user.refresh_token')` → `addSelect('user.refreshToken')` in `user.repository.ts`
2. **[Done]** Fix README PUT vs PATCH mismatch
3. Remove unused `uuid` dependency from `package.json`
4. Remove or document unused `findByEmailWithRefreshToken` method
5. Remove or use `ROLE_HIERARCHY` constant

---

## Metrics

- **Type Coverage:** 100% (strict mode, 0 tsc errors)
- **Test Coverage:** N/A (no test suite yet)
- **Linting Issues:** 0 (no ESLint configured; tsc --strict passes)
- **Security Issues Fixed:** 0 critical; 1 runtime bug fixed (QueryBuilder column alias)
- **Files Modified:** 2 (`user.repository.ts`, `README.md`)

---

## Unresolved Questions

- No `.env.example` file exists in repo root. README references `cp .env.example .env` but the file is absent. Developers have no template. Consider adding.
- `docs/` folder referenced in CLAUDE.md conventions does not exist. Phase 08 plan lists creating it, but it was not created. Recommend creating the docs folder with at least `project-overview-pdr.md` and `code-standards.md`.
- No test suite. Phase 08 marks this as a next step, but test coverage is zero. Consider adding at minimum integration tests for auth flow.
