# Chat Channel API

Express.js REST API with JWT cookie-based authentication and role-based access control. Foundation for a chat channel application.

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js 5 + TypeScript
- **Database**: PostgreSQL via TypeORM
- **Auth**: JWT (httpOnly cookies) + bcryptjs
- **Validation**: class-validator + class-transformer
- **Docs**: Swagger UI (swagger-jsdoc + swagger-ui-express)
- **Security**: helmet, cors, express-rate-limit

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm 9+

## Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd chat-chanel-api
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your DB credentials and JWT secrets

# 3. Create database
createdb chat_channel_db

# 4. Run migrations (TypeORM synchronize handles dev schema)
npm run dev  # starts server; tables created automatically in dev mode

# 5. Seed default admin
npm run seed

# 6. Start development server
npm run dev
```

## Environment Variables

See `.env.example` for all variables. Key settings:

| Variable | Default | Description |
|---|---|---|
| PORT | 3000 | Server port |
| DB_HOST | localhost | PostgreSQL host |
| DB_PORT | 5432 | PostgreSQL port |
| DB_USERNAME | postgres | DB username |
| DB_PASSWORD | postgres | DB password |
| DB_NAME | chat_channel_db | Database name |
| JWT_ACCESS_SECRET | - | Access token secret (required) |
| JWT_REFRESH_SECRET | - | Refresh token secret (required) |
| JWT_ACCESS_EXPIRATION | 15m | Access token TTL |
| JWT_REFRESH_EXPIRATION | 7d | Refresh token TTL |
| CORS_ORIGIN | http://localhost:3000 | Allowed origin |

## API Endpoints

### Auth (`/api/auth`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /api/auth/register | Public | Register new user |
| POST | /api/auth/login | Public | Login, sets cookies |
| POST | /api/auth/logout | Required | Clear auth cookies |
| POST | /api/auth/refresh | Public | Refresh access token |
| GET | /api/auth/profile | Required | Get current user |

### Admin - Users (`/api/admin/users`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/admin/users | Admin | List users (paginated) |
| POST | /api/admin/users | Admin | Create user with role |
| GET | /api/admin/users/:id | Admin | Get user by ID |
| PUT | /api/admin/users/:id | Admin | Update user |
| DELETE | /api/admin/users/:id | Admin | Soft delete user |

### Other

| Method | Path | Description |
|---|---|---|
| GET | /health | Health check |
| GET | /api/docs | Swagger UI |

## Default Admin Credentials

Created by `npm run seed`. **Change these after first login.**

```
Email:    admin@chat-channel.com
Password: Admin@123456
```

Override with env vars: `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`

## Scripts

```bash
npm run dev      # Start dev server with hot reload
npm run build    # Compile TypeScript to dist/
npm run start    # Run compiled dist/server.js
npm run seed     # Create default admin user
npm run typeorm  # TypeORM CLI
```

## Project Structure

```
src/
├── config/          # env, database, swagger configuration
├── constants/       # roles, error message constants
├── controllers/     # request handlers
├── dtos/            # input validation classes
├── entities/        # TypeORM entities
├── interfaces/      # TypeScript interfaces
├── middlewares/     # auth, error handling, rate limiting, logging
├── repositories/    # data access layer
├── routes/          # Express router definitions
├── seeds/           # database seed scripts
├── services/        # business logic
├── utils/           # jwt, password, cookie, response helpers
├── app.ts           # Express app setup
└── server.ts        # Server entry point
```

## Security Notes

- JWT stored in httpOnly cookies (not localStorage)
- Passwords hashed with bcrypt (12 rounds)
- Rate limiting: 100 req/15min general, 10 req/15min auth
- Helmet sets security headers
- Input validation via class-validator on all DTOs
- Soft delete preserves user records

## Next Steps

- Real-time messaging with WebSockets
- Channel/chat room entities
- File upload support
- Unit and integration test suite
- Docker + docker-compose
- CI/CD pipeline
