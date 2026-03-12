# API Guide - Chat Channel API

Base URL: `http://localhost:3001/api`

---

## 1. Authentication

### 1.1 Register

```
POST /api/auth/register
```

**Request:**
```json
{
  "email": "user@gmail.com",
  "password": "12345678",
  "fullName": "Nguyen Van A"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "id": "uuid",
    "email": "user@gmail.com",
    "fullName": "Nguyen Van A",
    "role": "employee",
    "isActive": true,
    "position": null,
    "companyId": null,
    "createdAt": "2026-03-11T04:04:22.526Z",
    "updatedAt": "2026-03-11T04:04:22.526Z"
  }
}
```

> Cookie `access_token` + `refresh_token` auto set (httpOnly)

---

### 1.2 Login

```
POST /api/auth/login
```

**Request:**
```json
{
  "email": "admin@gmail.com",
  "password": "admin123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "id": "043213ee-691f-4611-8470-df5f9da02d87",
    "email": "admin@gmail.com",
    "fullName": "System Admin",
    "role": "admin",
    "isActive": true,
    "position": "System Administrator",
    "companyId": null,
    "createdAt": "2026-03-11T04:04:22.526Z",
    "updatedAt": "2026-03-11T04:04:22.526Z"
  }
}
```

**Error (401):**
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

---

### 1.3 Logout

```
POST /api/auth/logout
```

> Requires: Cookie auth

**Response (200):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

### 1.4 Refresh Token

```
POST /api/auth/refresh
```

> Requires: `refresh_token` cookie

**Response (200):**
```json
{
  "success": true,
  "message": "Token refreshed"
}
```

> New `access_token` + `refresh_token` cookies auto set

---

### 1.5 Get Profile

```
GET /api/auth/profile
```

> Requires: Cookie auth

**Response (200):**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "id": "043213ee-691f-4611-8470-df5f9da02d87",
    "email": "admin@gmail.com",
    "fullName": "System Admin",
    "role": "admin",
    "isActive": true,
    "position": "System Administrator",
    "companyId": null,
    "createdAt": "2026-03-11T04:04:22.526Z",
    "updatedAt": "2026-03-11T04:04:22.526Z"
  }
}
```

---

## 2. Company Management (Admin only)

### 2.1 List Companies

```
GET /api/companies
```

> Requires: Admin cookie

**Response (200):**
```json
{
  "success": true,
  "message": "Companies retrieved",
  "data": [
    {
      "id": "9d320885-4dab-4970-a933-66b813fb9fe9",
      "name": "Company A",
      "description": "First company",
      "address": null,
      "phone": null,
      "isActive": true,
      "createdAt": "2026-03-11T23:35:16.060Z",
      "updatedAt": "2026-03-11T23:35:16.060Z"
    }
  ]
}
```

---

### 2.2 Get Company by ID

```
GET /api/companies/:id
```

**Response (200):**
```json
{
  "success": true,
  "message": "Company retrieved",
  "data": {
    "id": "9d320885-4dab-4970-a933-66b813fb9fe9",
    "name": "Company A",
    "description": "First company",
    "address": null,
    "phone": null,
    "isActive": true,
    "createdAt": "2026-03-11T23:35:16.060Z",
    "updatedAt": "2026-03-11T23:35:16.060Z"
  }
}
```

---

### 2.3 Create Company

```
POST /api/companies
```

**Request:**
```json
{
  "name": "New Corp",
  "description": "A new company",
  "address": "123 Street",
  "phone": "0901234567"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Company created",
  "data": {
    "id": "uuid",
    "name": "New Corp",
    "description": "A new company",
    "address": "123 Street",
    "phone": "0901234567",
    "isActive": true,
    "createdAt": "2026-03-12T...",
    "updatedAt": "2026-03-12T..."
  }
}
```

---

### 2.4 Update Company

```
PUT /api/companies/:id
```

**Request (partial update):**
```json
{
  "name": "Updated Corp",
  "isActive": false
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Company updated",
  "data": { "...updated company..." }
}
```

---

### 2.5 Delete Company

```
DELETE /api/companies/:id
```

**Response (200):**
```json
{
  "success": true,
  "message": "Company deleted"
}
```

---

## 3. User Management (Admin + Manager)

> - **Admin**: sees/manages ALL users, any role, any company
> - **Manager**: sees/manages ONLY users in their own company, can only assign `director` or `employee` roles

### 3.1 List Users

```
GET /api/admin/users?page=1&limit=10
```

**Admin Response (200) - sees all users:**
```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "id": "uuid",
      "email": "e@gmail.com",
      "fullName": "User E",
      "role": "director",
      "isActive": true,
      "position": "Giám đốc sản xuất",
      "companyId": "5de905cc-...",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "meta": {
    "total": 9,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

**Manager A Response (200) - only Company A users:**
```json
{
  "success": true,
  "message": "Success",
  "data": [
    { "email": "c@gmail.com", "role": "employee", "position": "Nhân viên kỹ thuật", "companyId": "9d320885-..." },
    { "email": "b@gmail.com", "role": "director", "position": "Giám đốc kinh doanh", "companyId": "9d320885-..." },
    { "email": "a@gmail.com", "role": "manager", "position": "Quản lý Company A", "companyId": "9d320885-..." }
  ],
  "meta": { "total": 3, "page": 1, "limit": 10, "totalPages": 1 }
}
```

**Employee/Director Response (403):**
```json
{
  "success": false,
  "message": "Access forbidden"
}
```

---

### 3.2 Get User by ID

```
GET /api/admin/users/:id
```

**Response (200):**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "id": "c13fbd24-...",
    "email": "c@gmail.com",
    "fullName": "User C",
    "role": "employee",
    "isActive": true,
    "position": "Nhân viên kỹ thuật",
    "companyId": "9d320885-...",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Manager tries to access user from another company (IDOR blocked):**
```json
{
  "success": false,
  "message": "User not found"
}
```

---

### 3.3 Create User

```
POST /api/admin/users
```

**Admin Request (any role, any company):**
```json
{
  "email": "new@gmail.com",
  "password": "12345678",
  "fullName": "New User",
  "role": "manager",
  "position": "Quản lý chi nhánh",
  "companyId": "9d320885-4dab-4970-a933-66b813fb9fe9"
}
```

**Manager Request (only director/employee, companyId auto-set):**
```json
{
  "email": "new-emp@gmail.com",
  "password": "12345678",
  "fullName": "New Employee",
  "role": "employee",
  "position": "Nhân viên kinh doanh"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Created successfully",
  "data": {
    "id": "uuid",
    "email": "new-emp@gmail.com",
    "fullName": "New Employee",
    "role": "employee",
    "isActive": true,
    "position": "Nhân viên kinh doanh",
    "companyId": "9d320885-...",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Manager tries to create admin (blocked):**
```json
{
  "success": false,
  "message": "Managers can only create director or employee accounts"
}
```

**Email already exists (409):**
```json
{
  "success": false,
  "message": "Email is already taken"
}
```

---

### 3.4 Update User

```
PUT /api/admin/users/:id
```

**Request (partial update):**
```json
{
  "fullName": "Updated Name",
  "role": "director",
  "position": "Trưởng phòng IT",
  "isActive": false
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "id": "uuid",
    "email": "user@gmail.com",
    "fullName": "Updated Name",
    "role": "director",
    "isActive": false,
    "position": "Trưởng phòng IT",
    "companyId": "9d320885-...",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Manager tries to assign admin role (blocked):**
```json
{
  "success": false,
  "message": "Managers can only assign director or employee roles"
}
```

**Manager tries to move user to another company (blocked):**
```json
{
  "success": false,
  "message": "Managers cannot move users to another company"
}
```

---

### 3.5 Delete User

```
DELETE /api/admin/users/:id
```

**Response (200):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**Self-delete (blocked):**
```json
{
  "success": false,
  "message": "You cannot delete your own account"
}
```

**Manager deletes admin/manager (blocked):**
```json
{
  "success": false,
  "message": "Managers cannot delete admin or manager accounts"
}
```

---

## 4. API Keys

> Requires: Cookie auth. All users can manage their own API keys.

### 4.1 Create API Key

```
POST /api/api-keys
```

**Request:**
```json
{
  "name": "My Integration Key",
  "expiresAt": "2027-01-01T00:00:00.000Z"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Created successfully",
  "data": {
    "id": "uuid",
    "name": "My Integration Key",
    "keyPrefix": "ck_a1b2c3d4",
    "key": "ck_a1b2c3d4e5f6g7h8i9j0...",
    "expiresAt": "2027-01-01T00:00:00.000Z",
    "lastUsedAt": null,
    "isActive": true,
    "revokedAt": null,
    "revokedReason": null,
    "createdAt": "..."
  }
}
```

> `key` field is returned ONLY on creation. Save it — it cannot be retrieved later.

---

### 4.2 List API Keys

```
GET /api/api-keys
```

**Response (200):**
```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "id": "uuid",
      "name": "My Integration Key",
      "keyPrefix": "ck_a1b2c3d4",
      "expiresAt": "2027-01-01T00:00:00.000Z",
      "lastUsedAt": "2026-03-12T...",
      "isActive": true,
      "revokedAt": null,
      "revokedReason": null,
      "createdAt": "..."
    }
  ]
}
```

---

### 4.3 Revoke API Key

```
POST /api/api-keys/:id/revoke
```

**Request:**
```json
{
  "reason": "No longer needed"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "API key revoked"
}
```

---

### 4.4 Delete API Key

```
DELETE /api/api-keys/:id
```

**Response (200):**
```json
{
  "success": true,
  "message": "API key deleted"
}
```

---

## 5. Using API Key for Authentication

Instead of cookie, send header:

```
x-api-key: ck_a1b2c3d4e5f6g7h8i9j0...
```

**Example:**
```bash
curl -H "x-api-key: ck_your_key_here" http://localhost:3001/api/auth/profile
```

Auth priority: Cookie first → API key fallback → 401

---

## 6. Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "message": "Error description"
}
```

| Status | Meaning |
|--------|---------|
| 400 | Validation error / Bad request |
| 401 | Not authenticated |
| 403 | Forbidden (insufficient role) |
| 404 | Resource not found |
| 409 | Conflict (duplicate email/name) |
| 500 | Internal server error |

---

## 7. User Fields Reference

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Auto-generated |
| email | string | Unique, normalized lowercase |
| fullName | string | 2-100 chars |
| role | enum | `admin`, `manager`, `director`, `employee` |
| isActive | boolean | Account active status |
| position | string\|null | Job position/title (max 100 chars) |
| companyId | UUID\|null | FK to company (null for admin) |
| createdAt | datetime | ISO 8601 |
| updatedAt | datetime | ISO 8601 |

---

## 8. Roles & Permissions Summary

| Role | Manage Companies | Manage Users | Scope |
|------|-----------------|--------------|-------|
| **admin** | Full CRUD | Full CRUD, any role | Global |
| **manager** | No access | CRUD director/employee | Own company only |
| **director** | No access | No access | - |
| **employee** | No access | No access | - |

---

## 9. Test Accounts

| Email | Password | Role | Position | Company |
|-------|----------|------|----------|---------|
| admin@gmail.com | admin123 | admin | System Administrator | - |
| a@gmail.com | a123456789 | manager | Quản lý Company A | Company A |
| b@gmail.com | b123456789 | director | Giám đốc kinh doanh | Company A |
| c@gmail.com | c123456789 | employee | Nhân viên kỹ thuật | Company A |
| d@gmail.com | d123456789 | manager | Quản lý Company B | Company B |
| e@gmail.com | e123456789 | director | Giám đốc sản xuất | Company B |

---

## 10. Swagger Docs

Interactive API docs: `http://localhost:3001/api/docs`

JSON spec: `http://localhost:3001/api/docs.json`
