# Phase 06: Middleware & Security

**Status:** pending
**Dependencies:** Phase 01 (can run partially parallel with Phase 04-05)

## Context Links
- [Plan Overview](./plan.md)

## Overview
Implement cross-cutting middleware: global error handler, DTO validation, rate limiting, and request logging. Harden security configuration.

## Key Insights
- Error handler is the last middleware in Express chain
- Validation middleware uses class-transformer + class-validator pipeline
- Rate limiting most critical on auth endpoints
- Custom AppError class for typed error handling

## Requirements
- Global error handler catches all unhandled errors
- Validation middleware transforms + validates request body via DTOs
- Rate limiting prevents brute force on auth
- Request logging for debugging

## Architecture
```
src/
├── middlewares/
│   ├── error-handler.middleware.ts
│   ├── validation.middleware.ts
│   ├── rate-limiter.middleware.ts
│   └── request-logger.middleware.ts
└── utils/
    └── app-error.ts           # Custom error class
```

## Implementation Steps

### 1. Custom AppError Class
```typescript
class AppError extends Error {
  statusCode: number
  isOperational: boolean
  constructor(message: string, statusCode: number) { ... }
}
```
- Extend for specific errors: NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, ValidationError

### 2. Error Handler Middleware
- Catches all errors passed via `next(error)`
- If AppError (operational): return structured error response with statusCode
- If unknown error: return 500, log full error, return generic message
- In development: include stack trace
- In production: hide internals

### 3. Validation Middleware
- Factory function: `validationMiddleware(DtoClass)`
- Steps:
  1. `plainToInstance(DtoClass, req.body)` - transform plain to DTO
  2. `validate(dtoInstance)` - run class-validator
  3. If errors: format and return 400 with field-level error messages
  4. If valid: set `req.body = dtoInstance`, call next()

### 4. Rate Limiter Middleware
- Auth endpoints: 5 requests per minute per IP (strict)
- General API: 100 requests per minute per IP
- Use `express-rate-limit`
- Custom response format matching API response structure

### 5. Request Logger Middleware
- Log: method, URL, status code, response time
- Use `console.log` or simple format (no external logger for MVP)
- Skip health check endpoint

### 6. Security hardening in app.ts
- `helmet()` - security headers
- `cors({ origin, credentials })` - configured origins
- `express.json({ limit: '10kb' })` - body size limit
- Disable `x-powered-by` header

## Todo List
- [ ] app-error.ts with subclasses
- [ ] error-handler.middleware.ts
- [ ] validation.middleware.ts
- [ ] rate-limiter.middleware.ts
- [ ] request-logger.middleware.ts
- [ ] Update app.ts with all middleware
- [ ] Update auth routes with rate limiting

## Success Criteria
- Invalid DTO input returns 400 with field-level errors
- Unhandled errors return 500 with generic message
- AppError subclasses return correct status codes
- Rate limiter blocks excessive requests with 429
- Request logger outputs method, path, status, duration
- Helmet headers present in responses

## Risk Assessment
- **Low**: Rate limiter may need tuning in production
- **Low**: Error handler must not leak stack traces in production

## Security Considerations
- Never expose internal error details in production
- Rate limiting prevents credential stuffing
- Body size limit prevents payload attacks
- Helmet protects against common web vulnerabilities
- CORS restricts cross-origin requests

## Next Steps
-> Phase 07: Swagger & Documentation
