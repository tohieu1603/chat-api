import { AppDataSource } from '../config/database.config';
import { UserToken } from '../entities/user-token.entity';

class UserTokenRepository {
  private get repo() {
    return AppDataSource.getRepository(UserToken);
  }

  async create(data: Partial<UserToken>): Promise<UserToken> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async findAll(): Promise<UserToken[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findByUserId(userId: string): Promise<UserToken[]> {
    return this.repo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }
}

export const userTokenRepository = new UserTokenRepository();
