# Phase 4: MCP Server + Tools

## Context Links
- Plan overview: [plan.md](./plan.md)
- Phase 2 (entity changes): [phase-02](./phase-02-user-entity-auth-updates.md)
- Phase 3 (deps + utils): [phase-03](./phase-03-mcp-dependencies-config.md)
- Brainstorm: `plans/reports/brainstorm-260312-1738-mcp-create-user-tool.md`
- MCP TypeScript SDK: [github.com/modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk)

## Overview
- **Priority:** P1
- **Status:** complete
- **Effort:** 2h
- **Description:** Create MCP server with Streamable HTTP transport (stateless, per-request), register `create_user_account` + `list_roles` tools, mount at `POST /mcp` with auth guard.

## Key Insights
- **Stateless per-request pattern**: new `StreamableHTTPServerTransport` per request with `sessionIdGenerator: undefined` — prevents request ID collisions across clients
- **Auth reuse**: existing `authenticateToken` + `authorizeRoles(ADMIN)` middleware guards the `/mcp` route — MCP SDK never handles auth
- **Tool naming**: MCP tools use `snake_case` names per convention
- **SDK imports**: `@modelcontextprotocol/sdk/server/mcp.js` and `@modelcontextprotocol/sdk/server/streamableHttp.js` (even in TS, the `.js` extension is required in import paths)
- **Zod for schemas**: SDK uses Zod for `inputSchema` definition with type inference
- **`req.user` available**: after `authenticateToken` middleware, `req.user` has `{ userId, email, role, companyId }` — passed into tool context
- Project uses CommonJS — SDK ships CJS exports, compatible

## Requirements

### Functional
- `POST /mcp` — protected by `authenticateToken` + `authorizeRoles(ADMIN)`
- Tool `create_user_account`:
  - Inputs: `email` (optional), `fullName` (required), `role` (enum), `position` (optional)
  - Hidden from agent: `companyId` (auto from caller), `createdBy` (auto from caller), `password` (from env), `mustChangePassword` (always true)
  - Email auto-generation when omitted (via `generateEmail` util from Phase 3)
  - Output: `{ id, email, fullName, role, position, companyId, mustChangePassword, createdBy }`
- Tool `list_roles`:
  - No inputs
  - Returns role hierarchy with descriptions and `canManage` arrays
  - Admin role excluded (system-only)

### Non-functional
- Stateless transport — no session state, safe for horizontal scaling
- JSON response mode (`enableJsonResponse: true`) — agent expects JSON, not SSE
- `res.on('close')` cleanup for transport

## Architecture
```
POST /mcp
  → authenticateToken (cookie JWT or x-api-key)
  → authorizeRoles(ADMIN)
  → mcpRouter handler
    → new McpServer (with tools pre-registered)
    → new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })
    → server.connect(transport)
    → transport.handleRequest(req, res, req.body)
    → res.on('close') → transport.close()
```

### File Structure
```
src/mcp/
  mcp-router.ts            ← Express router + stateless handler
  tools/
    user-account.tool.ts   ← create_user_account tool registration
    role-list.tool.ts      ← list_roles tool registration
```

## Related Code Files

| Action | File |
|--------|------|
| Create | `src/mcp/tools/user-account.tool.ts` |
| Create | `src/mcp/tools/role-list.tool.ts` |
| Create | `src/mcp/mcp-router.ts` |
| Modify | `src/app.ts` |

## Implementation Steps

### Step 1: Create `src/mcp/tools/role-list.tool.ts`

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

interface RoleInfo {
  role: string;
  level: number;
  description: string;
  canManage: string[];
}

const ROLES: RoleInfo[] = [
  {
    role: 'director',
    level: 3,
    description: 'Giám đốc company - quản lý manager và employee cùng company',
    canManage: ['manager', 'employee'],
  },
  {
    role: 'manager',
    level: 2,
    description: 'Quản lý - quản lý employee cùng company',
    canManage: ['employee'],
  },
  {
    role: 'employee',
    level: 1,
    description: 'Nhân viên - không có quyền quản lý',
    canManage: [],
  },
];

export function registerListRolesTool(server: McpServer): void {
  server.tool(
    'list_roles',
    'Danh sách vai trò có thể gán khi tạo tài khoản. '
    + 'Director (giám đốc) quản lý manager + employee. '
    + 'Manager (quản lý) quản lý employee. '
    + 'Employee (nhân viên) không có quyền quản lý. '
    + 'KHÔNG bao gồm admin (chỉ dùng hệ thống).',
    {},
    async () => {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(ROLES, null, 2),
          },
        ],
      };
    },
  );
}
```

**Notes:**
- Uses `server.tool()` — simpler API for tools with no/simple input schema
- Empty `{}` for inputSchema = no parameters
- Admin role intentionally excluded — not assignable via MCP
- Descriptions in Vietnamese for agent context

### Step 2: Create `src/mcp/tools/user-account.tool.ts`

```typescript
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { userRepository } from '../../repositories/user.repository';
import { hashPassword } from '../../utils/password.util';
import { generateEmail } from '../../utils/email-generator.util';
import { envConfig } from '../../config/env.config';
import { UserRole } from '../../constants/roles.constant';
import { UserResponseDto } from '../../dtos/user.dto';
import { JwtPayload } from '../../interfaces/jwt-payload.interface';

// Company repository needed for email generation (lookup company name)
import { AppDataSource } from '../../config/database.config';
import { Company } from '../../entities/company.entity';

const inputSchema = {
  email: z
    .string()
    .email()
    .optional()
    .describe('Email tài khoản. Nếu bỏ trống, hệ thống tự tạo từ họ tên + tên công ty.'),
  fullName: z
    .string()
    .min(2)
    .describe('Họ và tên đầy đủ của người dùng (bắt buộc).'),
  role: z
    .enum(['director', 'manager', 'employee'])
    .describe(
      'Vai trò: '
      + '"director" = giám đốc (quản lý manager + employee cùng company), '
      + '"manager" = quản lý (quản lý employee cùng company), '
      + '"employee" = nhân viên (không có quyền quản lý). '
      + 'Chọn dựa trên chức vụ thực tế của người dùng.',
    ),
  position: z
    .string()
    .optional()
    .describe('Chức vụ cụ thể, ví dụ: "Giám đốc kinh doanh", "Trưởng phòng IT".'),
};

export function registerCreateUserTool(server: McpServer, getCaller: () => JwtPayload): void {
  server.tool(
    'create_user_account',
    'Tạo tài khoản người dùng mới trong cùng công ty với người gọi. '
    + 'Mật khẩu mặc định được gán tự động, người dùng phải đổi mật khẩu khi đăng nhập lần đầu. '
    + 'Email có thể bỏ trống để hệ thống tự sinh từ họ tên + tên công ty.',
    inputSchema,
    async (params) => {
      const caller = getCaller();

      // Validate caller has companyId
      if (!caller.companyId) {
        return {
          content: [{ type: 'text' as const, text: 'Lỗi: Người gọi chưa được gán vào công ty nào.' }],
          isError: true,
        };
      }

      try {
        // Resolve email
        let email = params.email;
        if (!email) {
          // Lookup company name for email generation
          const companyRepo = AppDataSource.getRepository(Company);
          const company = await companyRepo.findOne({ where: { id: caller.companyId } });
          if (!company) {
            return {
              content: [{ type: 'text' as const, text: 'Lỗi: Không tìm thấy công ty.' }],
              isError: true,
            };
          }

          email = await generateEmail(
            params.fullName,
            company.name,
            async (candidate) => {
              const existing = await userRepository.findByEmail(candidate);
              return existing !== null;
            },
          );
        }

        // Check email uniqueness
        const existing = await userRepository.findByEmail(email);
        if (existing) {
          return {
            content: [{ type: 'text' as const, text: `Lỗi: Email "${email}" đã được sử dụng.` }],
            isError: true,
          };
        }

        // Create user with default password
        const hashedPassword = await hashPassword(envConfig.defaultUserPassword);
        const user = await userRepository.create({
          email,
          password: hashedPassword,
          fullName: params.fullName,
          role: params.role as UserRole,
          position: params.position || null,
          companyId: caller.companyId,
          mustChangePassword: true,
          createdBy: caller.userId,
          isActive: true,
        });

        const response = UserResponseDto.fromEntity(user);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [{ type: 'text' as const, text: `Lỗi: ${error.message || 'Không thể tạo tài khoản.'}` }],
          isError: true,
        };
      }
    },
  );
}
```

**Key design decisions:**
- `getCaller: () => JwtPayload` — closure injected by mcp-router, captures `req.user` from Express middleware. This avoids passing Express req into MCP tool context.
- `companyId` auto-filled from caller — agent never sees or provides it
- `createdBy` auto-filled from `caller.userId`
- `mustChangePassword` always `true` for MCP-created accounts
- Password from `envConfig.defaultUserPassword`
- Email generation uses `generateEmail` util when email not provided
- Error handling returns `isError: true` MCP responses (agent sees error, no throw)

### Step 3: Create `src/mcp/mcp-router.ts`

```typescript
import { Router, Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { authenticateToken } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/role-guard.middleware';
import { UserRole } from '../constants/roles.constant';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { registerCreateUserTool } from './tools/user-account.tool';
import { registerListRolesTool } from './tools/role-list.tool';

const router = Router();

// Auth: only ADMIN can access MCP endpoint
const guard = [authenticateToken, authorizeRoles(UserRole.ADMIN)];

/**
 * Stateless MCP endpoint.
 * Each request gets a fresh McpServer + StreamableHTTPServerTransport.
 * This prevents request ID collisions across different clients.
 */
router.post('/', ...guard, async (req: Request, res: Response) => {
  try {
    // Capture caller from Express auth middleware
    const caller = req.user as JwtPayload;

    // Create per-request MCP server with tools
    const server = new McpServer({
      name: 'auth-chat-operis',
      version: '1.0.0',
    });

    // Register tools with caller context
    registerCreateUserTool(server, () => caller);
    registerListRolesTool(server);

    // Create stateless transport
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    // Cleanup on connection close
    res.on('close', () => {
      transport.close();
    });

    // Connect and handle
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('MCP request error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
});

export default router;
```

**Key design decisions:**
- **Per-request `McpServer`**: new instance per request ensures complete isolation. McpServer is lightweight — no persistent state.
- **`getCaller` closure**: captures `req.user` from Express middleware before entering MCP context. Clean boundary between Express auth and MCP tools.
- **`enableJsonResponse: true`**: agent expects JSON responses, not SSE streams.
- **JSON-RPC error format**: matches MCP protocol spec for error responses.
- **Guard reuses existing middleware**: `authenticateToken` (cookie or API key) + `authorizeRoles(ADMIN)`.

### Step 4: Mount in `src/app.ts`

Add import and route:

**Add import (after existing route imports):**
```typescript
import mcpRouter from './mcp/mcp-router';
```

**Add route (after existing routes, before 404 handler):**
```typescript
app.use('/mcp', mcpRouter);
```

**Full updated routes section:**
```typescript
// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/api-keys', apiKeyRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/byteplus', byteplusProxyRoutes);
app.use('/mcp', mcpRouter);
```

Note: `/mcp` is NOT under `/api/` prefix — MCP protocol convention uses root-level path.

### Step 5: Verify directory structure

After all files created:
```
src/mcp/
  mcp-router.ts
  tools/
    user-account.tool.ts
    role-list.tool.ts
```

## Todo List
- [ ] Create directory `src/mcp/tools/`
- [ ] Create `src/mcp/tools/role-list.tool.ts` with `list_roles` tool
- [ ] Create `src/mcp/tools/user-account.tool.ts` with `create_user_account` tool
- [ ] Create `src/mcp/mcp-router.ts` with stateless handler
- [ ] Add `import mcpRouter` and `app.use('/mcp', mcpRouter)` in `app.ts`
- [ ] Compile check: `npx tsc --noEmit`
- [ ] Manual test: `curl -X POST http://localhost:3000/mcp -H "x-api-key: <admin-key>" -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'`
- [ ] Manual test: call `create_user_account` tool via MCP protocol
- [ ] Manual test: call `list_roles` tool via MCP protocol

## Success Criteria
- `POST /mcp` returns 401 without auth
- `POST /mcp` returns 403 for non-admin users
- `POST /mcp` with admin API key returns MCP protocol responses
- `tools/list` returns `create_user_account` + `list_roles`
- `create_user_account` with fullName + role creates user with:
  - Auto-generated email (if email omitted)
  - Default password from env
  - `mustChangePassword: true`
  - `createdBy` set to caller's userId
  - `companyId` set to caller's companyId
- `list_roles` returns 3 roles (director, manager, employee) without admin
- No TypeScript compilation errors

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| MCP SDK import paths need `.js` extension | Medium | Use exact paths: `@modelcontextprotocol/sdk/server/mcp.js` |
| Per-request McpServer performance | Low | McpServer is lightweight; tools are just function registrations |
| `enableJsonResponse` not available in older SDK versions | Medium | Require SDK >= 1.10.0 in package.json |
| Express 5 `req`/`res` type compatibility with MCP SDK | Low | SDK uses standard Node `IncomingMessage`/`ServerResponse`; Express extends these |
| `getCaller` closure stale reference | None | Closure captures `req.user` synchronously before async tool execution |

## Security Considerations
- **Auth boundary**: Express middleware handles auth BEFORE MCP server sees the request. MCP tools never handle auth.
- **ADMIN-only**: `authorizeRoles(ADMIN)` — only admin users can access MCP endpoint
- **Company scoping**: `create_user_account` forces `companyId` from caller — agent cannot create users in other companies
- **No password exposure**: default password is hashed before storage; never returned in response
- **Audit trail**: `createdBy` tracks which admin created each account
- **Input validation**: Zod schemas validate all tool inputs at MCP protocol level before tool handler executes

## Next Steps
After all 4 phases complete:
1. Run `npx tsc --noEmit` — full compilation check
2. Run `npm run dev` — verify server starts
3. Run seed: `npm run seed` — populate test data
4. Manual MCP protocol test via curl
5. Update project documentation in `./docs/`
