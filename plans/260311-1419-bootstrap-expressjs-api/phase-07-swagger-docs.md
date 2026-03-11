# Phase 07: Swagger & Documentation

**Status:** pending
**Dependencies:** Phase 04, Phase 05

## Context Links
- [Plan Overview](./plan.md)

## Overview
Add OpenAPI/Swagger documentation using swagger-jsdoc + swagger-ui-express. Document all endpoints with request/response schemas.

## Key Insights
- swagger-jsdoc reads JSDoc comments from route files
- Swagger UI served at `/api/docs`
- Define reusable schemas for DTOs and common responses
- Bearer token auth configured in Swagger

## Requirements
- All endpoints documented with request/response examples
- Swagger UI accessible in browser
- Auth endpoints clearly marked as public/protected
- Admin endpoints marked as admin-only

## Architecture
```
src/
└── config/
    └── swagger.config.ts     # Swagger options + setup
```

## Implementation Steps

### 1. Swagger Config
```typescript
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: { title: 'Chat Channel API', version: '1.0.0', description: '...' },
    servers: [{ url: '/api' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
      },
      schemas: { /* reusable DTO schemas */ }
    }
  },
  apis: ['./src/routes/*.ts']
}
```

### 2. Add JSDoc to Auth Routes
Document each endpoint:
- Summary, description
- Request body schema
- Response schemas (200, 400, 401)
- Tags: ['Auth']

### 3. Add JSDoc to Admin Routes
Document each endpoint:
- Summary, description
- Path parameters (id)
- Query parameters (page, limit, role, search)
- Request body schema
- Response schemas (200, 201, 400, 403, 404)
- Security: bearerAuth
- Tags: ['Admin - Users']

### 4. Mount Swagger UI
In app.ts:
```typescript
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
```

### 5. Define Reusable Schemas
- UserResponse, LoginRequest, RegisterRequest
- PaginatedResponse, ErrorResponse
- CreateUserRequest, UpdateUserRequest

## Todo List
- [ ] swagger.config.ts
- [ ] JSDoc comments on auth.routes.ts
- [ ] JSDoc comments on admin.routes.ts
- [ ] Mount swagger UI in app.ts
- [ ] Verify all endpoints render in Swagger UI

## Success Criteria
- `/api/docs` loads Swagger UI
- All 10 endpoints documented
- "Try it out" works for public endpoints
- Bearer auth button allows token entry
- Request/response schemas match actual DTOs

## Risk Assessment
- **Low**: JSDoc comments can drift from actual implementation - keep close to route definitions

## Security Considerations
- Swagger UI may be disabled in production (env toggle)
- No sensitive defaults in example values

## Next Steps
-> Phase 08: Final Integration & Testing
