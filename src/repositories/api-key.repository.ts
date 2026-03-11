import { Repository, IsNull } from 'typeorm';
import { AppDataSource } from '../config/database.config';
import { ApiKey } from '../entities/api-key.entity';

export class ApiKeyRepository {
  private repository: Repository<ApiKey>;

  constructor() {
    this.repository = AppDataSource.getRepository(ApiKey);
  }

  async create(data: Partial<ApiKey>): Promise<ApiKey> {
    const key = this.repository.create(data);
    return this.repository.save(key);
  }

  async findByKeyHash(keyHash: string): Promise<ApiKey | null> {
    return this.repository.findOne({
      where: { keyHash, isActive: true, revokedAt: IsNull() },
    });
  }

  async findByIdAndUserId(id: string, userId: string): Promise<ApiKey | null> {
    return this.repository.findOne({ where: { id, userId } });
  }

  async findAllByUserId(userId: string): Promise<ApiKey[]> {
    return this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async updateLastUsed(id: string): Promise<void> {
    await this.repository.update(id, { lastUsedAt: new Date() });
  }

  async revoke(id: string, reason: string): Promise<void> {
    await this.repository.update(id, {
      isActive: false,
      revokedAt: new Date(),
      revokedReason: reason,
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }
}

export const apiKeyRepository = new ApiKeyRepository();
