# MCP Server Integration Research Report

**Date:** 2026-03-12
**Scope:** Building MCP tools/server integrated with existing Express.js 5 + TypeScript API

---

## 1. MCP Overview

Model Context Protocol (MCP) is a JSON-RPC 2.0 based standard (by Anthropic, open-sourced Nov 2024) that lets AI agents call tools and access resources on external servers. The protocol version as of 2026-03-12 is **2025-03-26**.

**Three primitive types:**
- **Tools** — agent-callable functions (what we need)
- **Resources** — read-only data endpoints
- **Prompts** — reusable prompt templates

---

## 2. SDK: `@modelcontextprotocol/sdk`

```
npm install @modelcontextprotocol/sdk zod
```

- **Production-stable version:** v1.x (v2 pre-alpha, not recommended for production)
- **v1.10.0+** first supported Streamable HTTP transport (April 2025)
- **Peer dependency:** Zod (internally uses Zod v4, but backward-compatible with Zod v3.25+)
- **Note:** This project already uses Zod indirectly via class-validator; needs explicit Zod install

Key imports:
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
```

---

## 3. Transport Options

### 3a. stdio (NOT for us)
- Server launched as subprocess by client
- Reads JSON-RPC from stdin, writes to stdout
- For local CLI tools / Claude Desktop config
- **Not suitable** for a remote HTTP API

### 3b. SSE (deprecated as of spec 2025-03-26)
- Old protocol version 2024-11-05
- Two endpoints: GET `/sse` + POST `/messages`
- **Deprecated** — do not use for new builds

### 3c. Streamable HTTP (RECOMMENDED)
- **Current standard** as of spec 2025-03-26
- Single HTTP endpoint supporting both POST and GET
- POST = client sends JSON-RPC requests
- GET = optional SSE stream for server-to-client notifications
- Can respond as `application/json` (simple) or `text/event-stream` (SSE streaming)
- **Stateless mode:** `sessionIdGenerator: undefined` — each request fully independent
- **Stateful mode:** UUID session IDs via `Mcp-Session-Id` header

**Which mode for us:**
- **Stateless** is best. Our tools (create_user_account) are pure request-response. No need for persistent sessions, enables horizontal scaling and load balancers.

---

## 4. MCP Server Architecture Patterns

### Pattern A: Standalone MCP Server (separate process)
```
Client → MCP HTTP endpoint (port 3001) → imports services from shared lib
```
Separate Express app just for MCP. Clean isolation but requires cross-port calls or shared TypeORM connection.

### Pattern B: MCP routes mounted on existing Express app (RECOMMENDED)
```
Client → POST /mcp → MCP handler → same services (adminUserService, etc.)
```
MCP endpoint added to existing `app.ts`. Reuses all existing services, middleware, TypeORM connection, no duplication.

**Recommended: Pattern B** — mounts `/mcp` route directly in `app.ts`, reuses `adminUserService.createUser()` and other services.

---

## 5. Tool Definition Pattern

Using `McpServer` high-level API with Zod schemas (preferred over low-level `Server` + `setRequestHandler`):

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const mcpServer = new McpServer({ name: "operis-admin", version: "1.0.0" });

mcpServer.tool(
  "create_user_account",
  "Create a new employee account. Returns the created user and a temporary password.",
  {
    email: z.string().email().describe("Employee email address"),
    fullName: z.string().min(2).max(100).describe("Full name"),
    role: z.enum(["manager", "director", "employee"]).describe("User role"),
    position: z.string().max(100).optional().describe("Job title/position"),
    companyId: z.string().uuid().optional().describe("Company UUID to assign user to"),
    temporaryPassword: z.string().min(8).optional()
      .describe("Optional temp password; auto-generated if omitted"),
  },
  async ({ email, fullName, role, position, companyId, temporaryPassword }) => {
    // call adminUserService.createUser(...)
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);
```

**Key points:**
- `server.tool(name, description, zodSchema, handler)` — 4-arg form
- Alternatively: `server.registerTool(name, { description, inputSchema }, handler)` — object form
- Zod schema auto-converts to JSON Schema for the MCP protocol
- Handler returns `{ content: [{ type: "text", text: "..." }] }` for success
- Handler returns `{ content: [...], isError: true }` for tool-level errors (not HTTP errors)

---

## 6. Stateless Streamable HTTP with Express

**Correct stateless pattern** (create new transport+server per request to avoid ID collisions):

```typescript
// src/mcp/mcp.routes.ts
import express, { Request, Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { buildMcpServer } from "./mcp.server";

const router = express.Router();
router.use(express.json());

router.post("/", async (req: Request, res: Response) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
    enableJsonResponse: true,      // return JSON not SSE for simple calls
  });
  const server = buildMcpServer(); // factory fn creates McpServer + registers tools
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// GET: return 405 for stateless (no persistent SSE stream)
router.get("/", (_req: Request, res: Response) => {
  res.status(405).json({ error: "Method not allowed for stateless MCP server" });
});

export default router;
```

Mount in `app.ts`:
```typescript
import mcpRoutes from "./routes/mcp.routes";
app.use("/mcp", mcpRoutes);
```

---

## 7. Authentication Strategy

### The Problem
MCP tools must be admin-only. The existing API uses:
1. JWT cookies — not suitable for MCP (cookies require browser/session)
2. API keys (`x-api-key` header) — **perfect fit** for MCP clients

### Recommended: API Key Auth (existing infrastructure)

The project already has `ApiKey` entity, `apiKeyService.validateKey()`, and `authenticateApiKey` middleware. **Reuse it directly.**

```typescript
// Middleware applied BEFORE MCP handler
router.post("/", authenticateApiKey, authorizeRoles(UserRole.ADMIN, UserRole.MANAGER), async (req, res) => {
  // req.user is populated: { userId, email, role, companyId }
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  const server = buildMcpServer(req.user); // pass caller context to server factory
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});
```

**MCP client config (Claude Desktop / agent):**
```json
{
  "mcpServers": {
    "operis-admin": {
      "url": "http://localhost:3000/mcp",
      "headers": { "x-api-key": "ck_your_api_key_here" }
    }
  }
}
```

### Alternative: Bearer Token (standard OAuth 2.1 approach)
The MCP spec recommends OAuth 2.1 with `Authorization: Bearer <token>` for production remote servers. However, this requires an OAuth authorization server. For our internal agent use case, API key auth is simpler and sufficient.

**Simple Bearer + API key dual support:**
```typescript
export function mcpAuthMiddleware(req, res, next) {
  // Support both x-api-key header and Authorization: Bearer <key>
  const rawKey = req.headers["x-api-key"]
    || (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.slice(7) : undefined);
  if (!rawKey) return res.status(401).json({ error: "API key required" });
  // ... validate with apiKeyService
}
```

---

## 8. Force-Change-Password on First Login

The `User` entity does NOT currently have a `mustChangePassword` field. This needs to be added.

**Required entity change:**
```typescript
// user.entity.ts - add column
@Column({ name: 'must_change_password', default: false })
mustChangePassword!: boolean;
```

**Flow:**
1. MCP tool creates user with auto-generated or provided temp password + `mustChangePassword: true`
2. User logs in → auth service checks `mustChangePassword` flag
3. If true → return special response (e.g., HTTP 403 with `code: "PASSWORD_CHANGE_REQUIRED"`)
4. Frontend/client redirects to change-password flow
5. On successful password change → set `mustChangePassword: false`

**Tool behavior:**
```typescript
// In create_user_account tool handler
const tempPassword = params.temporaryPassword || generateTempPassword(); // e.g. "Temp@" + random 8 chars
const user = await adminUserService.createUser({
  ...params,
  password: tempPassword,
  mustChangePassword: true,
}, callerPayload);

return {
  content: [{
    type: "text",
    text: JSON.stringify({
      success: true,
      user: { id: user.id, email: user.email, role: user.role },
      temporaryPassword: tempPassword, // returned ONCE, agent can relay to admin
      note: "User must change password on first login"
    })
  }]
};
```

---

## 9. Proposed File Structure

```
src/
├── mcp/
│   ├── mcp.server.ts          # McpServer factory + tool registration
│   ├── mcp.tools.ts           # Tool definitions (create_user, list_users, etc.)
│   └── mcp.middleware.ts      # API key auth middleware for MCP (wraps existing)
├── routes/
│   └── mcp.routes.ts          # Express router: POST /mcp
```

Mounted in `app.ts`:
```typescript
app.use("/mcp", mcpRoutes);  // ~1 line addition
```

---

## 10. Dependency Changes

```json
// Add to package.json dependencies:
"@modelcontextprotocol/sdk": "^1.10.0",
"zod": "^3.25.0"
```

No new infrastructure needed. No new database, no new auth system.

---

## 11. Security Checklist

- Validate `Origin` header (Streamable HTTP spec requirement) — `@modelcontextprotocol/express` package handles this
- Admin/Manager role required via existing `authorizeRoles` middleware
- API key validated via existing `authenticateApiKey` middleware
- Rate limiting: reuse existing `express-rate-limit` setup
- Input validation: Zod schemas on all tool parameters
- Tool errors return `isError: true` in content, not unhandled exceptions
- Never return password hash in tool response
- Temp password returned ONCE in tool response (same as API key — show once pattern)

---

## 12. Additional Tools to Define (beyond create_user_account)

| Tool Name | Description | Auth Level |
|---|---|---|
| `create_user_account` | Create employee/director account with temp password | Admin/Manager |
| `list_users` | Paginated user list with optional search | Admin/Manager |
| `get_user` | Get user by ID | Admin/Manager |
| `deactivate_user` | Set isActive=false | Admin/Manager |
| `list_companies` | List companies | Admin |
| `assign_user_to_company` | Update user's companyId | Admin/Manager |

---

## 13. Integration Test Approach

MCP tools can be tested independently of the protocol by calling the service layer directly. For protocol-level testing, use the `@modelcontextprotocol/sdk` client:

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const client = new Client({ name: "test-client", version: "1.0.0" });
const transport = new StreamableHTTPClientTransport(
  new URL("http://localhost:3000/mcp"),
  { headers: { "x-api-key": TEST_API_KEY } }
);
await client.connect(transport);
const result = await client.callTool("create_user_account", { ... });
```

---

## Unresolved Questions

1. **Zod version conflict:** Project uses Zod indirectly; need to verify `@modelcontextprotocol/sdk` v1.x works with Zod v3.25+ (should be fine per docs, but confirm with `npm install` test).
2. **TypeORM module type:** `package.json` has `"type": "commonjs"` but MCP SDK uses `.js` ESM imports — need to check if `@modelcontextprotocol/sdk` v1.x supports CJS or requires `"type": "module"`. May need to use `require()` style imports or `tsconfig` path remapping.
3. **`mustChangePassword` migration:** TypeORM `synchronize: true` in dev handles this automatically; production migration script needed.
4. **Temp password policy:** What entropy/format for auto-generated temporary passwords? Suggest `Temp@` + 8 random alphanumeric chars to meet the MinLength(8) + special char requirements.
5. **MCP endpoint exposure:** Should `/mcp` be rate-limited separately (tighter than general API) given it's an admin-power endpoint?
6. **`companyId` on `JwtPayload`:** The existing `authenticateApiKey` middleware sets `req.user = { userId, email, role }` (no `companyId`). Need to verify if `companyId` is also fetched and set, since `AdminUserService.createUser` uses `caller.companyId` for manager scoping.

---

## Sources

- [MCP TypeScript SDK GitHub](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Transports Specification 2025-03-26](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports)
- [MCP Authorization Specification](https://modelcontextprotocol.io/specification/2025-03-26/basic/authorization)
- [Deploy Remote MCP Servers - Koyeb Tutorial](https://www.koyeb.com/tutorials/deploy-remote-mcp-servers-to-koyeb-using-streamable-http-transport)
- [Secure MCP Server Guide - Rebecca Deprey](https://rebeccamdeprey.com/blog/secure-mcp-server)
- [MCP Server Authentication - atlassc.net](https://atlassc.net/2026/02/25/building-an-mcp-server-with-authentication)
- [Why MCP Deprecated SSE - fka.dev](https://blog.fka.dev/blog/2025-06-06-why-mcp-deprecated-sse-and-go-with-streamable-http/)
- [MCP Auth - Bearer Auth Config](https://mcp-auth.dev/docs/configure-server/bearer-auth)
- [Adding Custom Tools to MCP Server - mcpcat.io](https://mcpcat.io/guides/adding-custom-tools-mcp-server-typescript/)
- [MCP with Node.js - DEV Community](https://dev.to/shadid12/how-to-build-mcp-servers-with-typescript-sdk-1c28)
