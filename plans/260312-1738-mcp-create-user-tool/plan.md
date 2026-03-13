---
title: "MCP Create User Account Tool"
description: "Add stateless Streamable HTTP MCP endpoint with create_user_account tool to existing auth API"
status: pending
priority: P2
effort: 3h
branch: Hung
tags: [mcp, user-management, auth, express]
created: 2026-03-12
---

# MCP Create User Account Tool

## Summary

Add MCP (Model Context Protocol) server to the existing Express.js auth API, exposing a `create_user_account` tool for AI agents. Uses stateless Streamable HTTP transport, protected by existing API key + role-guard middleware. Auto-created users get a default password from env config and a `must_change_password` flag forcing password change on first login.

## Architecture

```
AI Agent ─── POST /mcp (x-api-key: ck_xxx) ───▶ Express App
                                                   ├── authenticateToken (API key)
                                                   ├── authorizeRoles(ADMIN)
                                                   └── Stateless MCP Handler
                                                        └── create_user_account tool
                                                             └── adminUserService.createUser()
```

## Phases

| # | Phase | File | Status | Effort |
|---|-------|------|--------|--------|
| 1 | [Setup & Dependencies](./phase-01-setup-dependencies.md) | - | Pending | 15m |
| 2 | [User Entity Update](./phase-02-user-entity-update.md) | user.entity.ts, user.dto.ts | Pending | 30m |
| 3 | [Auth Change Password](./phase-03-auth-change-password.md) | auth.service.ts, auth.controller.ts, auth.routes.ts | Pending | 45m |
| 4 | [MCP Server Integration](./phase-04-mcp-server-integration.md) | mcp/ directory, app.ts | Pending | 1h30m |

## Dependencies

- Phase 2 depends on Phase 1 (zod installed)
- Phase 3 depends on Phase 2 (must_change_password column)
- Phase 4 depends on Phase 1 + 2 (SDK + entity update)
- Phase 3 and 4 are independent of each other

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Transport | Stateless Streamable HTTP | Agent calls HTTP; no sessions needed |
| Auth | Existing API key + authenticateToken | Already built, zero new infra |
| Tool scope | Only `create_user_account` | YAGNI |
| Password | `DEFAULT_USER_PASSWORD` env var | Configurable without redeploy |
| Mount point | `/mcp` on existing Express app | Shared process, shared DB |

## Reports

- [Brainstorm](../reports/brainstorm-260312-1738-mcp-create-user-tool.md)
- [MCP Express Integration Research](../reports/researcher-260312-1739-mcp-express-integration.md)
- [MCP Server Integration Research](../reports/researcher-260312-1739-mcp-server-integration.md)
