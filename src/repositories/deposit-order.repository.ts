import { AppDataSource } from '../config/database.config';
import { DepositOrder } from '../entities/deposit-order.entity';

class DepositOrderRepository {
  private get repo() {
    return AppDataSource.getRepository(DepositOrder);
  }

  async create(data: Partial<DepositOrder>): Promise<DepositOrder> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async findByCode(orderCode: string): Promise<DepositOrder | null> {
    return this.repo.findOne({ where: { orderCode } });
  }

  async findByIdAndUser(id: string, userId: string): Promise<DepositOrder | null> {
    return this.repo.findOne({ where: { id, userId } });
  }

  async findPendingByUser(userId: string, type?: string): Promise<DepositOrder | null> {
    const qb = this.repo.createQueryBuilder('d')
      .where('d.user_id = :userId', { userId })
      .andWhere('d.status = :status', { status: 'pending' })
      .andWhere('d.expires_at > NOW()');

    if (type) {
      qb.andWhere('d.type = :type', { type });
    }

    return qb.orderBy('d.created_at', 'DESC').getOne();
  }

  async findUserHistory(userId: string, limit = 20, offset = 0): Promise<[DepositOrder[], number]> {
    return this.repo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async findByPaymentReference(ref: string): Promise<DepositOrder | null> {
    return this.repo.findOne({ where: { paymentReference: ref } });
  }

  async updateStatus(id: string, data: Partial<DepositOrder>): Promise<void> {
    await this.repo.update(id, data);
  }

  async markExpired(): Promise<number> {
    const result = await this.repo.createQueryBuilder()
      .update()
      .set({ status: 'expired' })
      .where("status = 'pending' AND expires_at < NOW()")
      .execute();
    return result.affected ?? 0;
  }
}

export const depositOrderRepository = new DepositOrderRepository();
