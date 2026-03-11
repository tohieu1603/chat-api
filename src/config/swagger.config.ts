import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Chat Channel API',
      version: '1.0.0',
      description: 'Express.js TypeScript API with JWT cookie-based authentication and role-based authorization',
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Development' },
    ],
    components: {
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            fullName: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'director', 'employee'] },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        RegisterDto: {
          type: 'object',
          required: ['email', 'password', 'fullName'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            fullName: { type: 'string', minLength: 2 },
          },
        },
        LoginDto: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
        CreateUserDto: {
          type: 'object',
          required: ['email', 'password', 'fullName', 'role'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            fullName: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'director', 'employee'] },
          },
        },
        UpdateUserDto: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
            fullName: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'director', 'employee'] },
            isActive: { type: 'boolean' },
          },
        },
        CreateApiKeyDto: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', description: 'Descriptive name for the API key' },
            expiresAt: { type: 'string', format: 'date-time', description: 'Optional expiration date' },
          },
        },
        RevokeApiKeyDto: {
          type: 'object',
          properties: {
            reason: { type: 'string', description: 'Reason for revocation' },
          },
        },
        ApiKeyResponse: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            keyPrefix: { type: 'string', description: 'First 12 chars of key for identification' },
            expiresAt: { type: 'string', format: 'date-time', nullable: true },
            lastUsedAt: { type: 'string', format: 'date-time', nullable: true },
            isActive: { type: 'boolean' },
            revokedAt: { type: 'string', format: 'date-time', nullable: true },
            revokedReason: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        ApiKeyCreated: {
          allOf: [
            { $ref: '#/components/schemas/ApiKeyResponse' },
            { type: 'object', properties: { key: { type: 'string', description: 'Full API key (shown only once)' } } },
          ],
        },
      },
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'access_token',
          description: 'JWT access token stored in httpOnly cookie. Login to get the cookie set automatically.',
        },
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
          description: 'API key for programmatic access. Create via /api/api-keys endpoint.',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
