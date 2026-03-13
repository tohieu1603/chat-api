# Phase 4: MCP Server Integration

## Context Links
- [Plan overview](./plan.md)
- [Brainstorm](../reports/brainstorm-260312-1738-mcp-create-user-tool.md)
- [MCP Express Research](../reports/researcher-260312-1739-mcp-express-integration.md)
- [MCP Server Research](../reports/researcher-260312-1739-mcp-server-integration.md)
- [app.ts](../../src/app.ts)
- [admin-user.service.ts](../../src/services/admin-user.service.ts)
- [auth.middleware.ts](../../src/middlewares/auth.middleware.ts)
- [role-guard.middleware.ts](../../src/middlewares/role-guard.middleware.ts)
- [env.config.ts](../../src/config/env.config.ts)
- [jwt-payload.interface.ts](../../src/interfaces/jwt-payload.interface.ts)

## Overview
- **Priority:** High (core deliverable)
- **Status:** Pending
- **Description:** Create stateless Streamable HTTP MCP server mounted at `/mcp` with `create_user_account` tool. Protected by existing API key auth + ADMIN role guard.

## Key Insights
- **Stateless mode:** New McpServer + StreamableHTTPServerTransport per POST request. No session map.
- **SDK v1.x** uses `server.tool(name, description, zodSchema, handler)` shorthand
- **Auth reuse:** `authenticateToken` middleware supports API key via `x-api-key` header; populates `req.user` as `JwtPayload`
- **Tool reuses** `adminUserService.createUser()` which handles email uniqueness, manager role restrictions, password hashing
- **Default password** from `envConfig.mcp.defaultUserPassword`; tool always sets `mustChangePassword: true`
- CVE GHSA-345p-7cg4-v4c7: never reuse McpServer/transport across requests (stateless mode is immune)
- `enableJsonResponse: true` returns JSON instead of SSE for simple request/response tools

## Requirements

**Functional:**
- `POST /mcp` accepts MCP JSON-RPC requests
- `create_user_account` tool: accepts email, fullName, role, position?, companyId?
- Returns created user info + confirms mustChangePassword: true
- Auth: API key (x-api-key header) + ADMIN role required
- GET/DELETE /mcp return 405 (stateless, no SSE stream)

**Non-functional:**
- Stateless - no session tracking, no memory leak
- Transport closed on response close
- Files under 200 lines each

## Architecture

```
POST /mcp
    │
    ├── express.json() (already applied in app.ts)
    ├── authenticateToken (cookie or x-api-key)
    ├── authorizeRoles(ADMIN)
    │
    ▼ mcpRouter POST handler:
    ┌─────────────────────────────────────────┐
    │ 1. Create McpServer({ name, version })  │
    │ 2. Register tools (inject req.user)     │
    │ 3. Create StreamableHTTPServerTransport │
    │    { sessionIdGenerator: undefined }     │
    │ 4. server.connect(transport)            │
    │ 5. transport.handleRequest(req, res)    │
    │ 6. res.on('close', () => transport.close()) │
    └─────────────────────────────────────────┘
```

### File Structure
```
src/
├── mcp/
│   ├── mcp-router.ts              # Express Router: POST/GET/DELETE /
│   └── tools/
│       └── user-account.tool.ts   # create_user_account tool registration
```

## Related Code Files

**Create:**
- `src/mcp/tools/user-account.tool.ts` - tool definition with Zod schema
- `src/mcp/mcp-router.ts` - Express router with MCP transport handling

**Modify:**
- `src/app.ts` - mount `/mcp` route with auth middleware

## Implementation Steps

### 1. Create `src/mcp/tools/user-account.tool.ts`

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { adminUserService } from '../../services/admin-user.service';
import { envConfig } from '../../config/env.config';
import { JwtPayload } from '../../interfaces/jwt-payload.interface';
import { UserRole } from '../../constants/roles.constant';

export function registerUserAccountTools(server: McpServer, caller: JwtPayload): void {
  server.tool(
    'create_user_account',
    'Create a new user account with a default password. User must change password on first login.',
    {
      email: z.string().email().describe('User email address'),
      fullName: z.string().min(2).max(100).describe('Full name'),
      role: z.enum(['employee', 'director', 'manager']).describe('User role'),
      position: z.string().max(100).optional().describe('Job title/position'),
      companyId: z.string().uuid().optional().describe('Company UUID to assign user to'),
    },
    async ({ email, fullName, role, position, companyId }) => {
      try {
        const user = await adminUserService.createUser(
          {
            email,
            fullName,
            role: role as UserRole,
            password: envConfig.mcp.defaultUserPassword,
            position,
            companyId,
            mustChangePassword: true,
          },
          caller,
        );

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                position: user.position,
                companyId: user.companyId,
                mustChangePassword: true,
              },
              note: 'User must change password on first login',
            }),
          }],
        };
      } catch (error: any) {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              success: false,
              error: error.message || 'Failed to create user account',
            }),
          }],
          isError: true,
        };
      }
    },
  );
}
```

**Key patterns followed:**
- Uses `adminUserService` singleton (existing pattern)
- `envConfig.mcp.defaultUserPassword` from Phase 1
- `mustChangePassword: true` from Phase 2 entity update
- Error handling: catch AppError and return as MCP tool error (not HTTP error)
- Caller context (`JwtPayload`) injected via closure

### 2. Create `src/mcp/mcp-router.ts`

```typescript
import { Router, Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { registerUserAccountTools } from './tools/user-account.tool';

const router = Router();

/**
 * POST /mcp - Handle MCP JSON-RPC requests (stateless)
 * Each request creates fresh McpServer + transport (CVE safe)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const server = new McpServer({
      name: 'operis-auth-mcp',
      version: '1.0.0',
    });

    // Register tools with caller context from auth middleware
    registerUserAccountTools(server, req.user!);

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless
    });

    res.on('close', () => {
      transport.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null,
      });
    }
  }
});

/**
 * GET /mcp - Not supported in stateless mode
 */
router.get('/', (_req: Request, res: Response) => {
  res.status(405).json({
    jsonrpc: '2.0',
    error: { code: -32000, message: 'Method not allowed (stateless server)' },
    id: null,
  });
});

/**
 * DELETE /mcp - Not supported in stateless mode
 */
router.delete('/', (_req: Request, res: Response) => {
  res.status(405).json({
    jsonrpc: '2.0',
    error: { code: -32000, message: 'Method not allowed (stateless server)' },
    id: null,
  });
});

export default router;
```

**Key patterns followed:**
- `Router()` pattern matches existing routes (admin-user.routes.ts, auth.routes.ts)
- Error handling returns JSON-RPC error format
- `res.on('close')` cleanup prevents memory leaks
- Stateless: sessionIdGenerator undefined
- Default export matches existing route file pattern

### 3. Mount in `src/app.ts`

Add import after existing route imports (line ~14):
```typescript
import mcpRouter from './mcp/mcp-router';
```

Add route after existing routes, before 404 handler (line ~49):
```typescript
// MCP endpoint (admin only, API key or cookie auth)
app.use('/mcp', authenticateToken, authorizeRoles(UserRole.ADMIN), mcpRouter);
```

Add required imports:
```typescript
import { authenticateToken } from './middlewares/auth.middleware';
import { authorizeRoles } from './middlewares/role-guard.middleware';
import { UserRole } from './constants/roles.constant';
```

**Note:** `authenticateToken` and `authorizeRoles` are applied at mount level, not inside the router. This protects all MCP routes (POST/GET/DELETE).

### 4. Verify compilation
```bash
npx tsc --noEmit
```

### 5. Manual test with curl

**Initialize (list tools):**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "x-api-key: ck_your_admin_key" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-03-26",
      "capabilities": {},
      "clientInfo": { "name": "test", "version": "1.0.0" }
    }
  }'
```

**Call tool:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "x-api-key: ck_your_admin_key" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "create_user_account",
      "arguments": {
        "email": "test-mcp@example.com",
        "fullName": "MCP Test User",
        "role": "employee",
        "position": "Test Position",
        "companyId": "uuid-of-company"
      }
    }
  }'
```

**Verify 405 on GET:**
```bash
curl -X GET http://localhost:3000/mcp \
  -H "x-api-key: ck_your_admin_key"
# Expected: 405 Method Not Allowed
```

## Todo List
- [ ] Create `src/mcp/tools/` directory
- [ ] Create `src/mcp/tools/user-account.tool.ts`
- [ ] Create `src/mcp/mcp-router.ts`
- [ ] Mount `/mcp` route in `src/app.ts` with auth guards
- [ ] Verify `npx tsc --noEmit` passes
- [ ] Test: initialize MCP session via curl
- [ ] Test: call create_user_account tool via curl
- [ ] Test: verify 401 without API key
- [ ] Test: verify 403 with non-admin API key
- [ ] Test: verify 405 on GET/DELETE

## Success Criteria
- `POST /mcp` with admin API key can initialize MCP + call tools
- `create_user_account` creates user with `mustChangePassword: true`
- Created user password = `envConfig.mcp.defaultUserPassword`
- Duplicate email returns MCP tool error (isError: true)
- Non-admin API key returns 403
- No API key returns 401
- GET/DELETE /mcp returns 405

## Risk Assessment
| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| SDK import path issues with CJS | Low | Use `.js` extension; skipLibCheck: true |
| McpServer reuse across requests | None | Stateless = new server per request |
| Transport memory leak | Low | `res.on('close', () => transport.close())` |
| JSON body size | Low | Existing `express.json({ limit: '10kb' })` sufficient |

## Security Considerations
- Auth enforced at route mount level (cannot bypass for any HTTP method)
- ADMIN-only access; non-admin roles get 403
- API key validated via existing `apiKeyService.validateKey()` (SHA-256 hash comparison)
- Tool errors caught and returned as MCP error content (no stack traces leaked)
- Default password not returned in tool response (only user metadata)
- Stateless mode immune to CVE GHSA-345p-7cg4-v4c7

## Next Steps
- After all phases complete: end-to-end test flow
  1. Create API key for admin user
  2. Call MCP create_user_account
  3. Login as new user -> verify mustChangePassword: true
  4. Call POST /api/auth/change-password
  5. Login again -> verify mustChangePassword: false
- Update `docs/api-guide.md` with MCP endpoint documentation
- Consider future tools: list_users, deactivate_user (YAGNI for now)
