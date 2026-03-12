import { apiKeyRepository } from '../repositories/api-key.repository';
import { userRepository } from '../repositories/user.repository';
import { generateApiKey, hashApiKey, extractKeyPrefix } from '../utils/api-key.util';
import { AppError } from '../utils/app-error.util';
import { CreateApiKeyDto, ApiKeyResponseDto, ApiKeyCreatedResponseDto } from '../dtos/api-key.dto';

const API_KEY_ERRORS = {
  not_found: 'Không tìm thấy API key',
  already_revoked: 'API key đã bị thu hồi',
  expired: 'API key đã hết hạn',
  inactive: 'API key không hoạt động',
  user_not_found: 'Không tìm thấy người dùng',
} as const;

export class ApiKeyService {
  /**
   * Create a new API key for a user.
   * Returns the raw key ONCE - it cannot be retrieved again.
   */
  async createKey(userId: string, dto: CreateApiKeyDto): Promise<ApiKeyCreatedResponseDto> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound(API_KEY_ERRORS.user_not_found);
    }

    const rawKey = generateApiKey();
    const keyHash = hashApiKey(rawKey);
    const keyPrefix = extractKeyPrefix(rawKey);

    const apiKey = await apiKeyRepository.create({
      name: dto.name,
      keyPrefix,
      keyHash,
      userId,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      isActive: true,
    });

    return ApiKeyCreatedResponseDto.fromEntityWithKey(apiKey, rawKey);
  }

  /** List all API keys for a user (without raw key) */
  async listKeys(userId: string): Promise<ApiKeyResponseDto[]> {
    const keys = await apiKeyRepository.findAllByUserId(userId);
    return keys.map(ApiKeyResponseDto.fromEntity);
  }

  /** Revoke an API key - IDOR safe: checks userId ownership */
  async revokeKey(keyId: string, userId: string, reason?: string): Promise<void> {
    const key = await apiKeyRepository.findByIdAndUserId(keyId, userId);
    if (!key) {
      throw AppError.notFound(API_KEY_ERRORS.not_found);
    }
    if (key.isRevoked) {
      throw AppError.badRequest(API_KEY_ERRORS.already_revoked);
    }

    await apiKeyRepository.revoke(keyId, reason || 'user_revoked');
  }

  /** Delete an API key permanently (soft delete) - IDOR safe */
  async deleteKey(keyId: string, userId: string): Promise<void> {
    const key = await apiKeyRepository.findByIdAndUserId(keyId, userId);
    if (!key) {
      throw AppError.notFound(API_KEY_ERRORS.not_found);
    }

    await apiKeyRepository.softDelete(keyId);
  }

  /**
   * Validate an API key from request header.
   * Used by API key auth middleware.
   */
  async validateKey(rawKey: string): Promise<{ userId: string; keyId: string } | null> {
    const keyHash = hashApiKey(rawKey);
    const apiKey = await apiKeyRepository.findByKeyHash(keyHash);

    if (!apiKey) return null;
    if (!apiKey.isActive || apiKey.isRevoked) return null;
    if (apiKey.isExpired) return null;

    // Update last used timestamp (fire-and-forget)
    apiKeyRepository.updateLastUsed(apiKey.id).catch(() => {});

    return { userId: apiKey.userId, keyId: apiKey.id };
  }
}

export const apiKeyService = new ApiKeyService();
