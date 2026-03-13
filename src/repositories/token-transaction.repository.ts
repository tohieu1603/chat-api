import { AppDataSource } from '../config/database.config';
import { TokenTransaction } from '../entities/token-transaction.entity';

class TokenTransactionRepository {
  private get repo() {
    return AppDataSource.getRepository(TokenTransaction);
  }

  async create(data: Partial<TokenTransaction>): Promise<TokenTransaction> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async findByUser(userId: string, limit = 50, offset = 0): Promise<[TokenTransaction[], number]> {
    return this.repo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }
}

export const tokenTransactionRepository = new TokenTransactionRepository();
