export const AUTH_ERRORS = {
  invalid_credentials: 'Invalid email or password',
  token_expired: 'Token has expired',
  token_invalid: 'Token is invalid',
  unauthorized: 'Unauthorized access',
  forbidden: 'Access forbidden',
  email_taken: 'Email is already taken',
  refresh_token_invalid: 'Refresh token is invalid or expired',
} as const;

export const USER_ERRORS = {
  not_found: 'User not found',
  already_exists: 'User already exists',
  invalid_role: 'Invalid user role',
  cannot_delete_self: 'You cannot delete your own account',
} as const;

export const VALIDATION_ERRORS = {
  invalid_email: 'Invalid email address',
  password_too_short: 'Password must be at least 8 characters',
  required_field: 'This field is required',
} as const;

export const GENERAL_ERRORS = {
  internal_server_error: 'Internal server error',
  not_found: 'Resource not found',
  bad_request: 'Bad request',
} as const;
