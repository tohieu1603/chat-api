# Phase 3: MCP Dependencies + Config + Utils

## Context Links
- Plan overview: [plan.md](./plan.md)
- Phase 2 (prerequisite): [phase-02](./phase-02-user-entity-auth-updates.md)

## Overview
- **Priority:** P1
- **Status:** complete
- **Effort:** 30m
- **Description:** Install MCP SDK + Zod, add DEFAULT_USER_PASSWORD to env config, create email auto-generation utility with Vietnamese diacritics removal.

## Key Insights
- Project uses CommonJS (`"type": "commonjs"` in package.json) — `@modelcontextprotocol/sdk` ships CJS exports, compatible
- `remove-accents` is a lightweight zero-dependency npm package for diacritics removal (~2KB)
- Email auto-generation: normalize(fullName)@normalize(companyName).com
- Duplicate email handling: append incrementing number suffix

## Requirements

### Functional
- `@modelcontextprotocol/sdk` and `zod` installed as production dependencies
- `remove-accents` installed as production dependency
- `DEFAULT_USER_PASSWORD` available in `envConfig`
- Email generation util: Vietnamese name → email-safe slug

### Non-functional
- Zero config changes to tsconfig (Zod + MCP SDK work with ES2020 target + CJS module)

## Architecture
```
src/utils/email-generator.util.ts
  ├── removeAccents(str) → string (via remove-accents)
  ├── normalizeToSlug(str) → string (lowercase, no accents, dots for spaces)
  └── generateEmail(fullName, companyName, existingChecker) → string
```

## Related Code Files

| Action | File |
|--------|------|
| Modify | `package.json` (via npm install) |
| Modify | `src/config/env.config.ts` |
| Modify | `.env.example` |
| Create | `src/utils/email-generator.util.ts` |

## Implementation Steps

### Step 1: Install dependencies

```bash
npm install @modelcontextprotocol/sdk zod remove-accents
```

No `@types` needed — MCP SDK and Zod ship their own TypeScript declarations. `remove-accents` has types bundled.

### Step 2: Update `src/config/env.config.ts`

Add `defaultUserPassword` to the config object:

**Current code (last few lines):**
```typescript
  cors: {
    // Comma-separated origins: "http://localhost:3000,http://localhost:50051"
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map(o => o.trim()),
  },
};
```

**New code:**
```typescript
  cors: {
    // Comma-separated origins: "http://localhost:3000,http://localhost:50051"
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map(o => o.trim()),
  },
  defaultUserPassword: process.env.DEFAULT_USER_PASSWORD || 'Welcome@123',
};
```

### Step 3: Update `.env.example`

Append at end of file:
```
# MCP / User creation defaults
DEFAULT_USER_PASSWORD=Welcome@123
```

### Step 4: Create `src/utils/email-generator.util.ts`

```typescript
import removeAccents from 'remove-accents';

/**
 * Normalize a Vietnamese name to email-safe slug.
 * "Nguyễn Văn A" → "nguyen.van.a"
 */
function normalizeToSlug(str: string): string {
  return removeAccents(str)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '.')       // spaces → dots
    .replace(/[^a-z0-9.]/g, '') // strip non-alphanumeric except dots
    .replace(/\.{2,}/g, '.')    // collapse consecutive dots
    .replace(/^\.+|\.+$/g, ''); // trim leading/trailing dots
}

/**
 * Normalize company name to email domain part.
 * "Company A" → "companya"
 */
function normalizeToDomain(str: string): string {
  return removeAccents(str)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '')        // remove all spaces
    .replace(/[^a-z0-9]/g, ''); // strip non-alphanumeric
}

/**
 * Generate email from fullName + companyName.
 * Handles duplicates by appending number suffix.
 *
 * @param fullName - e.g. "Nguyễn Văn A"
 * @param companyName - e.g. "Company A"
 * @param emailExists - async checker function (returns true if email taken)
 * @returns e.g. "nguyen.van.a@companya.com" or "nguyen.van.a2@companya.com"
 */
export async function generateEmail(
  fullName: string,
  companyName: string,
  emailExists: (email: string) => Promise<boolean>,
): Promise<string> {
  const localPart = normalizeToSlug(fullName);
  const domain = normalizeToDomain(companyName);
  const baseEmail = `${localPart}@${domain}.com`;

  // Check base email first
  if (!(await emailExists(baseEmail))) {
    return baseEmail;
  }

  // Append incrementing suffix: localpart2@domain.com, localpart3@domain.com, ...
  let suffix = 2;
  while (suffix <= 100) {
    const candidate = `${localPart}${suffix}@${domain}.com`;
    if (!(await emailExists(candidate))) {
      return candidate;
    }
    suffix++;
  }

  // Fallback: should never reach here in practice
  throw new Error(`Không thể tạo email cho ${fullName} — quá nhiều trùng lặp`);
}
```

**Design decisions:**
- `emailExists` is injected as callback — keeps util decoupled from repository
- Max 100 suffix attempts — safeguard against infinite loop
- Pure function except for the async `emailExists` check
- No dependency on TypeORM or any service layer

## Todo List
- [ ] Run `npm install @modelcontextprotocol/sdk zod remove-accents`
- [ ] Add `defaultUserPassword` to `env.config.ts`
- [ ] Add `DEFAULT_USER_PASSWORD` to `.env.example`
- [ ] Create `src/utils/email-generator.util.ts`
- [ ] Compile check: `npx tsc --noEmit`
- [ ] Verify `remove-accents` works: quick test with Vietnamese string

## Success Criteria
- `npm ls @modelcontextprotocol/sdk zod remove-accents` shows all installed
- `envConfig.defaultUserPassword` resolves to env var or fallback
- `generateEmail("Nguyễn Văn A", "Company A", ...)` → `"nguyen.van.a@companya.com"`
- Duplicate handling: second call → `"nguyen.van.a2@companya.com"`
- No TypeScript compilation errors

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| MCP SDK CJS/ESM incompatibility | High | SDK ships CJS; project uses `"type": "commonjs"` — compatible |
| `remove-accents` missing edge cases | Low | Well-maintained package; covers Vietnamese, French, etc. |
| Email collisions at scale | Very Low | Suffix incrementing up to 100; unlikely in practice |

## Security Considerations
- `DEFAULT_USER_PASSWORD` is NOT a secret — it's a known default that users must change
- Env var keeps it configurable per deployment
- Password is immediately hashed via `hashPassword` before storage

## Next Steps
→ Phase 4: Create MCP server with `create_user_account` + `list_roles` tools, mount at `/mcp`
