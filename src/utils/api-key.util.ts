import crypto from 'crypto';

const API_KEY_PREFIX = 'ck_';
const API_KEY_LENGTH = 48; // bytes → 64 chars base64url

/**
 * Generate a cryptographically secure API key.
 * Format: ck_<random-base64url-string>
 */
export function generateApiKey(): string {
  const random = crypto.randomBytes(API_KEY_LENGTH).toString('base64url');
  return `${API_KEY_PREFIX}${random}`;
}

/**
 * SHA-256 hash of API key for storage. Fast lookup via indexed column.
 */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Extract prefix for display (first 12 chars including ck_ prefix).
 */
export function extractKeyPrefix(key: string): string {
  return key.substring(0, 12);
}
