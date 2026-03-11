import { Repository, IsNull } from 'typeorm';
import { AppDataSource } from '../config/database.config';
import { RefreshToken } from '../entities/refresh-token.entity';

export class RefreshTokenRepository {
  private repository: Repository<RefreshToken>;

  constructor() {
    this.repository = AppDataSource.getRepository(RefreshToken);
  }

  async create(data: Partial<RefreshToken>): Promise<RefreshToken> {
    const token = this.repository.create(data);
    return this.repository.save(token);
  }

  // Find active (non-revoked) token by family
  async findActiveByFamily(family: string): Promise<RefreshToken | null> {
    return this.repository.findOne({
      where: { family, revokedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  // Revoke a single token
  async revoke(id: string, reason: string): Promise<void> {
    await this.repository.update(id, {
      revokedAt: new Date(),
      revokedReason: reason,
    });
  }

  // Revoke entire token family (security breach / reuse detection)
  async revokeFamily(family: string, reason: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ revokedAt: new Date(), revokedReason: reason })
      .where('family = :family AND revoked_at IS NULL', { family })
      .execute();
  }

  // Revoke all tokens for a user (logout all devices)
  async revokeAllByUserId(userId: string, reason: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ revokedAt: new Date(), revokedReason: reason })
      .where('user_id = :userId AND revoked_at IS NULL', { userId })
      .execute();
  }

  // Find active tokens for a user (for listing sessions)
  async findActiveByUserId(userId: string): Promise<RefreshToken[]> {
    return this.repository.find({
      where: { userId, revokedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  // Cleanup expired tokens (maintenance task)
  async deleteExpired(): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .where('expires_at < :now', { now: new Date() })
      .execute();
    return result.affected || 0;
  }
}

export const refreshTokenRepository = new RefreshTokenRepository();
