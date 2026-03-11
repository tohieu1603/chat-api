# Phase 08: Final Integration & Testing

**Status:** pending
**Dependencies:** All previous phases

## Context Links
- [Plan Overview](./plan.md)

## Overview
Wire all modules together in app.ts, create database seed script, write project README, and perform integration verification.

## Key Insights
- app.ts is the central wiring point for all routes + middleware
- Seed script creates default admin user for first-time setup
- README provides setup instructions for new developers

## Requirements
- All routes mounted and functional end-to-end
- Default admin user seeded on first run
- README covers setup, env vars, running, API overview
- Manual testing checklist verified

## Architecture
```
src/
├── seeds/
│   └── admin-seed.ts         # Create default admin
├── app.ts                    # Final wiring
└── server.ts                 # Entry point
```

## Implementation Steps

### 1. Final app.ts Wiring
```typescript
// Middleware order:
1. helmet()
2. cors(corsConfig)
3. express.json({ limit: '10kb' })
4. requestLogger
5. rateLimiter (general)

// Routes:
app.use('/api/auth', authRateLimiter, authRoutes)
app.use('/api/admin/users', adminRoutes)

// Swagger:
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec))

// Health check:
app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

// Error handler (must be last):
app.use(errorHandler)
```

### 2. Admin Seed Script
- Check if admin user exists
- If not, create with env-configured email/password or defaults
- Hash password before insert
- Log result
- Run via: `npm run seed`
- Add script: `"seed": "ts-node src/seeds/admin-seed.ts"`

### 3. README.md
Sections:
- Project overview
- Tech stack
- Prerequisites (Node, PostgreSQL)
- Installation steps
- Environment variables (.env.example reference)
- Running (dev, build, start, seed)
- API endpoints table
- Swagger docs URL
- Project structure

### 4. Manual Testing Checklist
- [ ] Server starts, connects to DB
- [ ] Tables created (users)
- [ ] Seed creates admin user
- [ ] Register new user -> returns tokens
- [ ] Login -> returns tokens
- [ ] Access profile with token -> returns user
- [ ] Access profile without token -> 401
- [ ] Refresh token -> new access token
- [ ] Logout -> refresh token cleared
- [ ] Admin list users -> paginated results
- [ ] Admin create user with role -> success
- [ ] Admin update user -> success
- [ ] Admin delete user -> soft deleted
- [ ] Non-admin access admin routes -> 403
- [ ] Invalid input -> 400 with validation errors
- [ ] Rate limiter triggers -> 429
- [ ] Swagger UI loads -> all endpoints visible

### 5. Create docs/ files
- `docs/project-overview-pdr.md` - project overview
- `docs/code-standards.md` - coding standards followed
- `docs/codebase-summary.md` - module descriptions
- `docs/system-architecture.md` - architecture overview

## Todo List
- [ ] Finalize app.ts wiring
- [ ] admin-seed.ts
- [ ] README.md
- [ ] docs/ folder files
- [ ] Run full manual testing checklist
- [ ] Fix any integration issues
- [ ] Initial git commit

## Success Criteria
- `npm run dev` starts server, all routes functional
- `npm run seed` creates admin user
- `npm run build` compiles without errors
- All manual test cases pass
- Swagger UI shows all endpoints
- README complete and accurate

## Risk Assessment
- **Medium**: Integration issues when wiring all modules - resolve during testing
- **Low**: Seed script idempotency - check before insert

## Security Considerations
- Default admin password must be changed after first login (document in README)
- Seed script credentials not committed (use env vars)
- .env not in git

## Next Steps
Project bootstrap complete. Future work:
- Channel/chat entities and messaging
- WebSocket for real-time messaging
- File upload support
- Unit + integration test suite
- CI/CD pipeline
- Docker + docker-compose setup
