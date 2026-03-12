---
title: "MCP User Tool + Role Hierarchy Fix"
description: "Add MCP tools for auto-creating user accounts, fix role hierarchy, expand director permissions, add change-password flow"
status: complete
priority: P1
effort: 5h
branch: Hung
tags: [mcp, roles, auth, user-management]
created: 2026-03-12
---

# MCP User Tool + Role Hierarchy Fix

## Summary
Consolidate 7 changes: fix role hierarchy (director > manager), expand director CRUD permissions, add `must_change_password` + `created_by` to User entity, add MCP server with `create_user_account` + `list_roles` tools, add change-password endpoint, configure DEFAULT_USER_PASSWORD, update seed data.

## Phases

| # | Phase | Effort | Status | File |
|---|-------|--------|--------|------|
| 1 | Fix Role Hierarchy + Director Permissions | 1h | complete | [phase-01](./phase-01-fix-role-hierarchy.md) |
| 2 | User Entity + Auth Updates | 1.5h | complete | [phase-02](./phase-02-user-entity-auth-updates.md) |
| 3 | MCP Dependencies + Config + Utils | 30m | complete | [phase-03](./phase-03-mcp-dependencies-config.md) |
| 4 | MCP Server + Tools | 2h | complete | [phase-04](./phase-04-mcp-server-tools.md) |

## Dependencies
- Phase 2 depends on Phase 1 (role constants used in entity/auth)
- Phase 4 depends on Phase 2 + 3 (needs entity fields + deps + utils)

## Key Constraints
- Project uses CommonJS (`"type": "commonjs"` in package.json)
- Express 5, TypeORM 0.3, TypeScript strict mode
- All Vietnamese UI strings pattern
- Existing auth: cookie JWT + API key fallback via `authenticateToken`
- Existing role guard: `authorizeRoles(...roles)`

## Brainstorm Reference
- `plans/reports/brainstorm-260312-1738-mcp-create-user-tool.md`
