# Phase 04: Auth Module

**Status:** pending
**Dependencies:** Phase 03

## Context Links
- [Plan Overview](./plan.md)
- [Phase 03](./phase-03-user-entity.md)

## Overview
Implement authentication flow: register, login, logout, refresh token, get profile. Create JWT auth middleware and role-based guard middleware.

## Key Insights
- Access token: short-lived (15m), stored client-side only
- Refresh token: long-lived (7d), hashed before DB storage
- Logout invalidates refresh token in DB
- Auth middleware extracts user from JWT, attaches to request
- Role guard checks user role against allowed roles

## Requirements
- Register creates user with EMPLOYEE role, returns tokens
- Login validates credentials, returns access + refresh tokens
- Logout clears refresh token from DB
- Refresh generates new access token using valid refresh token
- Profile returns current authenticated user info
- Middleware protects routes requiring authentication
- Role guard restricts access by role

## Architecture
```
src/
├── services/
│   └── auth.service.ts
├── controllers/
│   └── auth.controller.ts
├── routes/
│   └── auth.routes.ts
└── middlewares/
    ├── auth.middleware.ts       # JWT verification
    └── role-guard.middleware.ts # Role-based access
```

## Implementation Steps

### 1. Auth Service
- `register(registerDto)`:
  1. Check email uniqueness
  2. Hash password
  3. Create user with EMPLOYEE role
  4. Generate access + refresh tokens
  5. Hash refresh token, store in DB
  6. Return tokens + user response DTO

- `login(loginDto)`:
  1. Find user by email (with password)
  2. Verify password with bcrypt
  3. Check isActive
  4. Generate tokens
  5. Hash + store refresh token
  6. Return tokens + user response DTO

- `logout(userId)`:
  1. Clear refresh token in DB
  2. Return success

- `refreshToken(refreshTokenDto)`:
  1. Verify refresh token JWT
  2. Find user by ID (with refreshToken field)
  3. Compare provided token hash with stored hash
  4. Generate new access token (and optionally new refresh token - rotation)
  5. Return new tokens

- `getProfile(userId)`:
  1. Find user by ID
  2. Return user response DTO

### 2. Auth Controller
- `POST /register` -> authService.register
- `POST /login` -> authService.login
- `POST /logout` -> authService.logout (requires auth middleware)
- `POST /refresh` -> authService.refreshToken
- `GET /profile` -> authService.getProfile (requires auth middleware)
- Wrap all handlers in try-catch, use response util

### 3. Auth Routes
```
router.post('/register', validationMiddleware(RegisterDto), authController.register)
router.post('/login', validationMiddleware(LoginDto), authController.login)
router.post('/logout', authMiddleware, authController.logout)
router.post('/refresh', validationMiddleware(RefreshTokenDto), authController.refresh)
router.get('/profile', authMiddleware, authController.getProfile)
```
Mount at `/api/auth`

### 4. Auth Middleware
- Extract Bearer token from Authorization header
- Verify JWT access token
- Find user by ID from token payload
- Attach user to `req.user`
- If invalid/expired, return 401

### 5. Role Guard Middleware
- Factory function: `roleGuard(...allowedRoles: UserRole[])`
- Returns middleware that checks `req.user.role` against allowedRoles
- If not allowed, return 403 Forbidden

### 6. Extend Express Request type
- Create `src/interfaces/express.d.ts` or augment Express Request
- Add `user?: { userId: string; email: string; role: UserRole }` to Request

## Todo List
- [ ] auth.service.ts
- [ ] auth.controller.ts
- [ ] auth.routes.ts
- [ ] auth.middleware.ts
- [ ] role-guard.middleware.ts
- [ ] Express Request type augmentation
- [ ] Mount auth routes in app.ts

## Success Criteria
- Register creates user, returns valid JWT tokens
- Login with correct credentials returns tokens
- Login with wrong credentials returns 401
- Logout invalidates refresh token
- Refresh with valid refresh token returns new access token
- Profile returns user data (no password)
- Protected routes reject unauthenticated requests
- Role guard blocks unauthorized roles

## Risk Assessment
- **Medium**: Token refresh race condition if multiple requests refresh simultaneously - use token rotation with grace period
- **Low**: JWT secret rotation strategy - out of scope for MVP

## Security Considerations
- Refresh token hashed before DB storage (bcrypt)
- Access token short-lived (15m) limits exposure window
- Logout immediately invalidates refresh token
- Auth middleware verifies token on every protected request
- Generic error messages for login failures (don't reveal if email exists)
- Rate limiting on auth endpoints (configured in Phase 06)

## Next Steps
-> Phase 05: Admin User Management
