# Phase 03: User Entity & Repository

**Status:** pending
**Dependencies:** Phase 02

## Context Links
- [Plan Overview](./plan.md)
- [Phase 02](./phase-02-base-infrastructure.md)

## Overview
Define User entity with TypeORM, create custom user repository, and define DTOs for request/response validation.

## Key Insights
- User entity extends BaseEntity for UUID + timestamps
- Password excluded from all query selects by default (use `addSelect` when needed)
- refreshToken stored as hashed value
- DTOs use class-validator decorators for input validation
- Response DTO omits password and refreshToken

## Requirements
- User fields: id, email (unique), password, fullName, role, isActive, refreshToken, timestamps, deletedAt
- Validation: email format, password min 8 chars, fullName required
- Soft delete support

## Architecture
```
src/
├── entities/
│   └── user.entity.ts
├── repositories/
│   └── user.repository.ts
└── dtos/
    ├── auth/
    │   ├── register.dto.ts
    │   ├── login.dto.ts
    │   └── refresh-token.dto.ts
    └── user/
        ├── create-user.dto.ts
        ├── update-user.dto.ts
        └── user-response.dto.ts
```

## Implementation Steps

### 1. User Entity
```
@Entity('users')
- id: UUID (from BaseEntity)
- email: string, unique, not null
- password: string, select: false (hidden by default)
- fullName: string, not null
- role: enum UserRole, default EMPLOYEE
- isActive: boolean, default true
- refreshToken: string, nullable, select: false
- createdAt, updatedAt, deletedAt (from BaseEntity)
```

### 2. User Repository
- Extends BaseRepository<User>
- `findByEmail(email)`: finds user including password field
- `findByEmailWithPassword(email)`: uses addSelect for password
- `findByIdWithRefreshToken(id)`: uses addSelect for refreshToken
- `updateRefreshToken(userId, hashedToken)`: update refresh token field
- `clearRefreshToken(userId)`: set refreshToken to null

### 3. DTOs

**RegisterDto:**
- email: @IsEmail, @IsNotEmpty
- password: @IsString, @MinLength(8), @Matches (uppercase, lowercase, number)
- fullName: @IsString, @IsNotEmpty, @MinLength(2)

**LoginDto:**
- email: @IsEmail, @IsNotEmpty
- password: @IsString, @IsNotEmpty

**RefreshTokenDto:**
- refreshToken: @IsString, @IsNotEmpty

**CreateUserDto (admin):**
- email: @IsEmail
- password: @IsString, @MinLength(8)
- fullName: @IsString, @IsNotEmpty
- role: @IsEnum(UserRole)
- isActive: @IsBoolean, @IsOptional (default true)

**UpdateUserDto (admin):**
- All fields @IsOptional
- email: @IsEmail
- fullName: @IsString
- role: @IsEnum(UserRole)
- isActive: @IsBoolean
- password: @IsString, @MinLength(8) (optional, for admin reset)

**UserResponseDto:**
- id, email, fullName, role, isActive, createdAt, updatedAt
- Static `fromEntity(user)` method to strip sensitive fields
- Static `fromEntities(users)` for arrays

## Todo List
- [ ] user.entity.ts
- [ ] user.repository.ts
- [ ] register.dto.ts
- [ ] login.dto.ts
- [ ] refresh-token.dto.ts
- [ ] create-user.dto.ts
- [ ] update-user.dto.ts
- [ ] user-response.dto.ts

## Success Criteria
- User entity creates `users` table with correct columns
- TypeORM migration/sync creates table successfully
- DTOs validate input correctly (reject invalid, accept valid)
- Password and refreshToken not returned in default queries
- UserResponseDto strips sensitive fields

## Risk Assessment
- **Low**: TypeORM select:false may cause issues if not handled carefully in queries
- **Low**: enum mapping between TypeScript and PostgreSQL

## Security Considerations
- Password `select: false` prevents accidental exposure
- refreshToken `select: false` same protection
- DTO validation rejects malformed input before hitting DB
- Email uniqueness enforced at DB level (unique constraint)

## Next Steps
-> Phase 04: Auth Module
