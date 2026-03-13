# Phase 1: Setup & Dependencies

## Context Links
- [Plan overview](./plan.md)
- [MCP Express Research](../reports/researcher-260312-1739-mcp-express-integration.md)
- [package.json](../../package.json)
- [env.config.ts](../../src/config/env.config.ts)
- [.env.example](../../.env.example)

## Overview
- **Priority:** High (blocks all other phases)
- **Status:** Pending
- **Description:** Install MCP SDK + Zod, add DEFAULT_USER_PASSWORD env var

## Key Insights
- SDK: `@modelcontextprotocol/sdk` v1.x ships CJS exports; compatible with `"module": "commonjs"` in tsconfig
- Zod required as peer dep by SDK; project has no Zod yet
- `.js` extension in imports required even in TS (`@modelcontextprotocol/sdk/server/mcp.js`)
- `skipLibCheck: true` already in tsconfig - no issues expected

## Requirements
- Install `@modelcontextprotocol/sdk` and `zod` as production dependencies
- Add `DEFAULT_USER_PASSWORD` to env config and .env.example
- Verify compilation succeeds after install

## Architecture
No architecture changes. Env config gets one new field.

## Related Code Files

**Modify:**
- `package.json` - add dependencies
- `src/config/env.config.ts` - add `defaultUserPassword` field
- `.env.example` - add `DEFAULT_USER_PASSWORD`

## Implementation Steps

### 1. Install packages
```bash
npm install @modelcontextprotocol/sdk zod
```

### 2. Update `src/config/env.config.ts`
Add inside `envConfig` object:
```typescript
// After the cors block (line ~32):
mcp: {
  defaultUserPassword: process.env.DEFAULT_USER_PASSWORD || 'Operis@2026',
},
```

### 3. Update `.env.example`
Append:
```
# MCP
DEFAULT_USER_PASSWORD=Operis@2026
```

### 4. Verify compilation
```bash
npx tsc --noEmit
```

## Todo List
- [ ] Run `npm install @modelcontextprotocol/sdk zod`
- [ ] Add `mcp.defaultUserPassword` to envConfig
- [ ] Add `DEFAULT_USER_PASSWORD` to .env.example
- [ ] Verify `npx tsc --noEmit` passes

## Success Criteria
- `npm ls @modelcontextprotocol/sdk zod` shows both installed
- `npx tsc --noEmit` passes without errors
- envConfig.mcp.defaultUserPassword returns correct value

## Risk Assessment
| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| CJS/ESM conflict | Low | SDK ships CJS; tsconfig is commonjs; skipLibCheck true |
| Zod version mismatch | Low | SDK peer dep is zod ^3.23; latest 3.x is fine |

## Security Considerations
- `DEFAULT_USER_PASSWORD` must be strong in production .env (not committed)
- .env.example contains safe default for dev only

## Next Steps
- Phase 2: User Entity Update (depends on this phase)
- Phase 4: MCP Server Integration (depends on this phase)
