# Docs Manager Report — MCP & Role Hierarchy Update

**Date:** 260313-0025
**Slug:** mcp-role-hierarchy-update

## Current State Assessment

Only `docs/api-guide.md` existed (734 lines). No `codebase-summary.md`, `system-architecture.md`, or `code-standards.md` present.

## Changes Made

### `docs/api-guide.md` (784 lines, was 734)

1. **Section 3 header** — updated from "Admin + Manager" to "Admin + Director + Manager", corrected permission descriptions:
   - Director: CRUD manager + employee in own company
   - Manager: CRUD employee only in own company

2. **Section 1.5 (new)** — added `POST /api/auth/change-password` with request/response docs, notes on `mustChangePassword` reset and refresh token invalidation. Existing 1.5 renumbered to 1.6.

3. **Section 3.1** — condensed duplicate response blocks into single example + prose note.

4. **Section 3.3** — updated error message for manager role restriction (employee only).

5. **Section 3.4** — updated error message for manager role assignment (employee only).

6. **Section 3.5** — updated blocked delete error to include director.

7. **Section 7 (User Fields)** — added `mustChangePassword` (boolean, default false) and `createdBy` (UUID|null self-ref FK).

8. **Section 8 (Roles)** — added hierarchy table with level numbers: admin(4) > director(3) > manager(2) > employee(1). Director row added with correct permissions.

9. **Section 9 (new MCP)** — documented `POST /mcp` endpoint: stateless Streamable HTTP, admin-only, 30 req/min rate limit, tools `create_user_account` + `list_roles`, email auto-generation algorithm, JSON-RPC 2.0 example.

10. **Section numbering** — Test Accounts → §10, Swagger → §11.

### `README.md` (164 lines, was 150)

- Added `DEFAULT_USER_PASSWORD` to env vars table.
- Added `POST /api/auth/change-password` to Auth endpoints table.
- Added MCP Server section with `/mcp` endpoint table.
- Updated Admin Users table: auth column shows Admin/Director/Manager.
- Added `zod`, `@modelcontextprotocol/sdk` to Tech Stack.
- Updated Security Notes: MCP rate limit (30 req/min), zod on MCP inputs, MCP admin-only note.
- Updated Project Structure: added `mcp/` with tools subdirectory, updated descriptions.

## Gaps Identified

- `docs/codebase-summary.md` — does not exist; repomix not run (no instruction to run it in this task).
- `docs/system-architecture.md` — does not exist.
- `docs/code-standards.md` — does not exist.
- `docs/api-guide.md` section 3 error messages (3.3, 3.4, 3.5) were updated to reflect director hierarchy but the exact error messages from the running service could not be verified from source (service layer not fully read). Messages updated conservatively.

## Verified Against Codebase

| Change | Verified via |
|--------|-------------|
| Role hierarchy admin(4)>director(3)>manager(2)>employee(1) | `src/constants/roles.constant.ts` |
| `mustChangePassword`, `createdBy` fields | `src/entities/user.entity.ts` |
| `POST /api/auth/change-password` | `src/routes/auth.routes.ts`, `src/services/auth.service.ts` |
| `ChangePasswordDto` fields | `src/dtos/auth.dto.ts` |
| MCP at `POST /mcp`, admin-only, stateless | `src/mcp/mcp-router.ts`, `src/app.ts` |
| `create_user_account` tool params & email gen | `src/mcp/tools/user-account.tool.ts`, `src/utils/email-generator.util.ts` |
| `list_roles` tool output | `src/mcp/tools/role-list.tool.ts` |
| `mcpRateLimiter` 30 req/min | `src/middlewares/rate-limiter.middleware.ts` |
| `DEFAULT_USER_PASSWORD` env var | `src/config/env.config.ts` |
| Dependencies: @modelcontextprotocol/sdk, zod, remove-accents | `package.json` |

## Unresolved Questions

- None.
