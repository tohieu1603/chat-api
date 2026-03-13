# MCP Server Express.js Integration Research

**Date:** 2026-03-12
**SDK:** `@modelcontextprotocol/sdk` v1.27.1 (latest)
**Target codebase:** `auth.chat.operis` — Express 5 + TypeORM + commonjs

---

## 1. Streamable HTTP Transport (2025-03-26 spec)

Replaces the old HTTP+SSE dual-endpoint approach. Key traits:
- Single `/mcp` endpoint handles POST (client→server) + GET (SSE stream, optional) + DELETE (terminate session)
- Session identified by `Mcp-Session-Id` request/response header
- Stateless mode supported: omit `sessionIdGenerator` (set `undefined`)
- SSE transport is **deprecated** — new work should use Streamable HTTP

**SDK import:**
```typescript
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
// OR the Node-specific wrapper (same thing):
import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/node.js';
```

---

## 2. Express.js Middleware / Route Approach

MCP mounts as standard Express routes — no special middleware required, but the SDK ships an optional `@modelcontextprotocol/express` helper that adds Host-header validation (DNS-rebinding protection).

### Stateless (simplest — recommended for this API)
Create fresh server+transport per request. No session map needed.

```typescript
import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

const app = express();
app.use(express.json());

// Auth middleware runs BEFORE MCP handler
app.post('/mcp', authenticateToken, async (req, res) => {
  const server = new McpServer({ name: 'operis-mcp', version: '1.0.0' });
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

  registerTools(server, req.user);   // inject auth context into tools

  res.on('close', () => transport.close());
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// Stateless: block GET/DELETE
app.get('/mcp', (_req, res) => res.status(405).json({ error: 'Method Not Allowed' }));
app.delete('/mcp', (_req, res) => res.status(405).json({ error: 'Method Not Allowed' }));
```

### Stateful (session-aware, needed for streaming notifications)
```typescript
import { randomUUID } from 'node:crypto';

const transports = new Map<string, StreamableHTTPServerTransport>();

// SECURITY NOTE (CVE GHSA-345p-7cg4-v4c7, fixed in v1.26.0):
// Never reuse a McpServer across sessions — new server per session.

app.post('/mcp', authenticateToken, async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;

  if (sessionId && transports.has(sessionId)) {
    // Existing session — reuse transport
    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res, req.body);
    return;
  }

  // New session
  const server = new McpServer({ name: 'operis-mcp', version: '1.0.0' });
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (sid) => transports.set(sid, transport),
  });

  registerTools(server, req.user);

  res.on('close', () => {
    transport.close();
    // cleanup happens via DELETE or timeout
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.get('/mcp', async (req, res) => {
  const sid = req.headers['mcp-session-id'] as string;
  const transport = transports.get(sid);
  if (!transport) return res.status(404).send('Session not found');
  await transport.handleRequest(req, res);
});

app.delete('/mcp', async (req, res) => {
  const sid = req.headers['mcp-session-id'] as string;
  const transport = transports.get(sid);
  if (transport) {
    await transport.close();
    transports.delete(sid);
  }
  res.status(200).send();
});
```

---

## 3. Shared Services Pattern (TypeORM + existing service layer)

The codebase exports singletons:
```typescript
export const userRepository = new UserRepository();
export const apiKeyService = new ApiKeyService();
export const companyService = new CompanyService();
// etc.
```

Since TypeORM `AppDataSource` is initialized before `app` is imported (`server.ts` pattern), all repositories are safe to call by the time any request hits `/mcp`.

**Recommended approach — closure injection:**
```typescript
// src/mcp/tools/index.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { userRepository } from '../repositories/user.repository';
import { companyService } from '../services/company.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

export function registerTools(server: McpServer, user: JwtPayload) {
  server.registerTool(
    'get_company',
    {
      description: 'Get company details for the authenticated user',
      inputSchema: { companyId: z.string().uuid().optional() },
    },
    async ({ companyId }) => {
      const id = companyId ?? user.companyId;
      if (!id) return { content: [{ type: 'text', text: 'No company associated' }] };
      const company = await companyService.getById(id);
      return { content: [{ type: 'text', text: JSON.stringify(company) }] };
    },
  );

  server.registerTool(
    'get_profile',
    { description: 'Get authenticated user profile', inputSchema: {} },
    async () => {
      const profile = await userRepository.findById(user.userId);
      return { content: [{ type: 'text', text: JSON.stringify(profile) }] };
    },
  );
}
```

- No DI framework needed — JS closures capture `user` (per-request context) and singletons (shared services) naturally.
- Services already handle errors via `AppError` — handlers propagate naturally.

---

## 4. Tool Registration API (`server.registerTool`)

Two equivalent APIs exist:

| Method | Notes |
|--------|-------|
| `server.registerTool(name, schema, handler)` | Official docs recommend this — supports `outputSchema` |
| `server.tool(name, zodObj, handler)` | Shorthand, identical behaviour |

**Canonical signature (v1.27.x):**
```typescript
server.registerTool(
  'tool_name',
  {
    title: 'Human readable title',           // optional
    description: 'What the tool does',
    inputSchema: z.object({ ... }),           // Zod object OR plain JSON Schema
    outputSchema: z.object({ ... }),          // optional structured output
  },
  async (params, ctx) => {
    // ctx.mcpReq.log('info', '...')         // MCP logging
    return {
      content: [{ type: 'text', text: '...' }],
      // structuredContent: { ... }          // if outputSchema defined
    };
  }
);
```

**Zod version:** SDK uses Zod internally; peerDep is `zod ^3.23` (compatible with v3.25+ and v4).
This codebase has no Zod yet — add `npm install zod`.

---

## 5. Authentication Integration

**Pattern for this codebase** — reuse the existing `authenticateToken` / `authenticateApiKey` middleware directly on the `/mcp` route:

```typescript
// Supports both cookie-JWT and API-key auth (existing middleware)
app.post('/mcp', authenticateToken, mcpHandler);
```

`req.user` is populated by the middleware before the handler runs. Pass it into `registerTools(server, req.user)` as shown above.

**No OAuth 2.1 needed** — the existing auth middleware is sufficient unless external LLM clients (e.g., Claude Desktop, Cursor) need to authenticate without pre-existing cookies/API keys. In that case, full OAuth 2.1 with PKCE would be required (separate concern).

---

## 6. Deployment: Same Process vs Separate

### Same process (recommended for this app)
Mount `/mcp` route directly on the existing Express app in `app.ts`:

```typescript
// app.ts — after existing routes
import { mcpRouter } from './routes/mcp.routes';
app.use('/mcp', mcpRouter);
```

Pros:
- Zero additional infrastructure
- Shares DB connection pool (TypeORM `AppDataSource` already initialized)
- Shares service singletons directly
- Single process to manage / deploy

Cons:
- MCP traffic and REST traffic contend for same Node.js event loop
- A long-running MCP tool could block the loop (mitigate with async/await)

### Separate process
Run a second Node.js process pointing to same Postgres DB, importing same services.

Pros: process isolation, independent scaling
Cons: duplicate DB connections, more complex deployment, overkill for current scale

**Verdict: Same process is correct for this codebase.**

---

## 7. File Structure Recommendation

```
src/
├── mcp/
│   ├── mcp-router.ts          # Express Router with POST/GET/DELETE /
│   └── tools/
│       ├── index.ts           # registerTools(server, user) entry
│       ├── company.tools.ts
│       ├── user.tools.ts
│       └── api-key.tools.ts
```

Mount in `app.ts`:
```typescript
import mcpRouter from './mcp/mcp-router';
app.use('/mcp', authenticateToken, mcpRouter);
```

`mcp-router.ts` only needs to manage transport lifecycle; tools stay in separate files (each <100 lines, honoring DRY/file-size rules).

---

## 8. Package Requirements

```bash
npm install @modelcontextprotocol/sdk zod
# optional helper (adds Host-header validation):
# npm install @modelcontextprotocol/express
```

`tsconfig.json` is `"module": "commonjs"` — SDK ships both CJS and ESM, CJS import paths work:
```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
```
(The `.js` extension is required even in TypeScript for ESM-style sub-path exports; with `"module": "commonjs"` and `skipLibCheck: true` this compiles correctly.)

---

## 9. Security Advisory Note

**CVE GHSA-345p-7cg4-v4c7** (fixed in SDK v1.26.0+):
- Never share a `McpServer` instance across multiple sessions/requests
- Never share a `StreamableHTTPServerTransport` across multiple requests
- Stateless mode (new server+transport per POST) is immune by design
- Stateful mode must create new server+transport per session (not per request)
- v1.27.1 (current latest) includes the runtime guard that throws on incorrect reuse

---

## Unresolved Questions

1. **External client auth:** If Claude Desktop / Cursor need to connect to `/mcp` without a session cookie or pre-issued API key, how do users authenticate? Full OAuth 2.1 PKCE flow would need to be added as separate endpoints.
2. **Session persistence:** Stateful mode uses in-memory `Map` — sessions lost on server restart. Is this acceptable, or does Redis session store need evaluation?
3. **Streaming notifications:** Does the product need server-initiated notifications (e.g., real-time events pushed to AI agent)? If yes, stateful + GET SSE stream is required. If tools are purely request/response, stateless is sufficient.
4. **Tool scope:** Which specific resources should be exposed as MCP tools? (users, companies, API keys, BytePlus proxy?) Requires product decision before implementation.
5. **Rate limiting:** The existing `apiRateLimiter` uses per-IP limits. MCP clients may multiplex multiple tool calls — should `/mcp` have separate rate-limit config?

---

## Sources

- [MCP TypeScript SDK (GitHub)](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Transports Specification 2025-03-26](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports)
- [MCP Build Server Guide](https://modelcontextprotocol.io/docs/develop/build-server)
- [MCP SDK server.md docs](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/server.md)
- [Security Advisory GHSA-345p-7cg4-v4c7](https://github.com/modelcontextprotocol/typescript-sdk/security/advisories/GHSA-345p-7cg4-v4c7)
- [StreamableHTTP Production Guide (MCPcat)](https://mcpcat.io/guides/building-streamablehttp-mcp-server/)
- [Why MCP deprecated SSE (fka.dev)](https://blog.fka.dev/blog/2025-06-06-why-mcp-deprecated-sse-and-go-with-streamable-http/)
- [MCP Streamable HTTP Deep Dive (Simplescraper)](https://simplescraper.io/blog/how-to-mcp)
- [HTTP Stream Transport (mcp-framework.com)](https://mcp-framework.com/docs/Transports/http-stream-transport/)
- [@modelcontextprotocol/sdk on npm](https://www.npmjs.com/package/@modelcontextprotocol/sdk)
