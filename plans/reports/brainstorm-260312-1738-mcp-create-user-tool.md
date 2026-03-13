# Brainstorm: MCP Tool for Auto-Create User Account

## Problem Statement
Custom AI agent needs MCP tool to auto-create employee accounts with default password (env-configurable). Users must change password on first login. Admin-only auth required.

## Agreed Solution: Stateless Streamable HTTP MCP Server

### Architecture
```
Custom Agent (code)
    │ POST /mcp (x-api-key: ck_xxxx)
    ▼
Express App (existing)
    ├── authenticateToken (API key fallback)
    ├── authorizeRoles(ADMIN)
    └── MCP Handler (stateless, per-request McpServer)
         └── Tool: create_user_account
              └── Reuses adminUserService + userRepository
```

### Key Decisions
| Decision | Choice | Rationale |
|---|---|---|
| Transport | Streamable HTTP (stateless) | Custom agent calls HTTP, no stdio needed |
| Auth | Existing API key + authenticateToken | Already built, agent sends x-api-key header |
| Tool scope | Only create_user_account | YAGNI |
| Password | Env var DEFAULT_USER_PASSWORD | Configurable without redeploy |
| Password flow | Login OK + mustChangePassword flag | Frontend handles redirect |
| MCP mounting | Route /mcp on existing Express app | Shared process, shared DB, zero new infra |

### Tool Schema
```typescript
create_user_account({
  email: string,          // required
  fullName: string,       // required
  role: "employee" | "director" | "manager",  // required
  position?: string,
  companyId?: string,     // UUID
})
→ { id, email, fullName, role, mustChangePassword: true }
```

### Changes Required
1. **User entity** - add `must_change_password: boolean` column (default false)
2. **MCP module** - `src/mcp/mcp-router.ts` + `src/mcp/tools/user-account.tool.ts`
3. **Auth flow** - login response includes mustChangePassword; add `POST /api/auth/change-password`
4. **app.ts** - mount `/mcp` route
5. **Dependencies** - `@modelcontextprotocol/sdk` + `zod`
6. **Env** - `DEFAULT_USER_PASSWORD` in .env.example

### Risks
| Risk | Mitigation |
|---|---|
| CJS/ESM compat | MCP SDK ships CJS exports |
| API key leak | SHA-256 hash, rotatable |
| Duplicate email | Existing uniqueness check |
| Default password | Env-configurable + force change |
