import { IsString, MinLength, MaxLength, IsOptional, IsDateString } from 'class-validator';
import { ApiKey } from '../entities/api-key.entity';

export class CreateApiKeyDto {
  @IsString()
  @MinLength(1, { message: 'Tên API key là bắt buộc' })
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsDateString({}, { message: 'Định dạng ngày hết hạn không hợp lệ' })
  expiresAt?: string;
}

export class RevokeApiKeyDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}

export class ApiKeyResponseDto {
  id!: string;
  name!: string;
  keyPrefix!: string;
  expiresAt?: Date | null;
  lastUsedAt?: Date | null;
  isActive!: boolean;
  revokedAt?: Date | null;
  revokedReason?: string | null;
  createdAt!: Date;

  static fromEntity(entity: ApiKey): ApiKeyResponseDto {
    const dto = new ApiKeyResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.keyPrefix = entity.keyPrefix;
    dto.expiresAt = entity.expiresAt;
    dto.lastUsedAt = entity.lastUsedAt;
    dto.isActive = entity.isActive;
    dto.revokedAt = entity.revokedAt;
    dto.revokedReason = entity.revokedReason;
    dto.createdAt = entity.createdAt;
    return dto;
  }
}

/** Returned only on creation - includes full key (only time it's visible) */
export class ApiKeyCreatedResponseDto extends ApiKeyResponseDto {
  key!: string;

  static fromEntityWithKey(entity: ApiKey, rawKey: string): ApiKeyCreatedResponseDto {
    const dto = new ApiKeyCreatedResponseDto();
    Object.assign(dto, ApiKeyResponseDto.fromEntity(entity));
    dto.key = rawKey;
    return dto;
  }
}
