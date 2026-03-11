# Phase 01: Project Setup & Configuration

**Status:** completed
**Dependencies:** none

## Context Links
- [Plan Overview](./plan.md)

## Overview
Initialize Node.js project with TypeScript, install all dependencies, configure TypeORM data source, environment variables, and create entry point files.

## Key Insights
- Use `ts-node-dev` for dev hot-reload, `tsc` for production build
- Keep env config centralized in one module with validation
- TypeORM DataSource initialized once, exported for reuse

## Requirements
- Node.js 18+, PostgreSQL 14+
- TypeScript strict mode
- Environment-based configuration (.env)

## Architecture
```
src/
├── config/
│   ├── data-source.ts      # TypeORM DataSource config
│   └── env.config.ts        # Env vars loader + validation
├── app.ts                   # Express app setup (middleware, routes)
└── server.ts                # Entry point (DB connect + listen)
```

## Related Code Files
- `package.json` - dependencies, scripts
- `tsconfig.json` - TypeScript config
- `.eslintrc.json` - linting rules
- `.env` / `.env.example` - environment variables
- `.gitignore` - git ignore patterns

## Implementation Steps

### 1. Initialize project
- `npm init -y`
- Set `"type": "module"` if needed or keep CommonJS

### 2. Install production dependencies
```
express, typeorm, pg, reflect-metadata, dotenv,
bcryptjs, jsonwebtoken, class-validator, class-transformer,
helmet, cors, express-rate-limit, swagger-jsdoc, swagger-ui-express,
uuid
```

### 3. Install dev dependencies
```
typescript, ts-node-dev, @types/express, @types/bcryptjs,
@types/jsonwebtoken, @types/cors, @types/swagger-jsdoc,
@types/swagger-ui-express, @types/uuid, eslint,
@typescript-eslint/parser, @typescript-eslint/eslint-plugin
```

### 4. Configure TypeScript
- `tsconfig.json`: strict, experimentalDecorators, emitDecoratorMetadata, outDir: dist, rootDir: src, esModuleInterop

### 5. Configure ESLint
- Basic TypeScript ESLint config

### 6. Create .env.example
```
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=chat_channel_db
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
```

### 7. Create .gitignore
- node_modules, dist, .env, *.js in root

### 8. Create env.config.ts
- Load dotenv, export typed config object
- Validate required vars present at startup

### 9. Create data-source.ts
- TypeORM DataSource with env-based config
- entities glob pattern, synchronize: true (dev only), logging: true (dev)

### 10. Create app.ts
- Initialize Express app
- Apply helmet, cors, json parser, rate limiter
- Mount route placeholders
- Error handler middleware (last)

### 11. Create server.ts
- Import reflect-metadata
- Initialize DataSource
- Start Express on configured port
- Graceful shutdown handling

### 12. Add npm scripts
```json
"dev": "ts-node-dev --respawn --transpile-only src/server.ts",
"build": "tsc",
"start": "node dist/server.js",
"lint": "eslint src/**/*.ts"
```

## Todo List
- [x] npm init + install deps
- [x] tsconfig.json
- [ ] .eslintrc.json (skipped - not required by task spec)
- [x] .env.example + .gitignore
- [x] src/config/env.config.ts
- [x] src/config/database.config.ts (as data-source.ts equivalent)
- [x] src/app.ts
- [x] src/server.ts
- [x] package.json scripts
- [x] `npm run build` compiles without errors (typecheck passes)

## Success Criteria
- `npm run dev` starts server, connects to PostgreSQL
- `npm run build` compiles without errors
- `npm run lint` passes
- .env.example documents all required vars

## Risk Assessment
- **Low**: TypeORM version compatibility - pin versions
- **Low**: reflect-metadata import order - must be first import in server.ts

## Security Considerations
- .env excluded from git
- No secrets in code, all via env vars
- DB credentials only in .env

## Next Steps
-> Phase 02: Base Infrastructure & Common Utils
