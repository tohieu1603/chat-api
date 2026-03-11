import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database.config';
import { User } from '../entities/user.entity';

export class UserRepository {
  private repository: Repository<User>;

  constructor() {
    this.repository = AppDataSource.getRepository(User);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email: email.toLowerCase().trim() })
      .getOne();
  }

  async findById(id: string): Promise<User | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findAllPaginated(page: number, limit: number): Promise<[User[], number]> {
    const skip = (page - 1) * limit;
    return this.repository.findAndCount({ skip, take: limit, order: { createdAt: 'DESC' } });
  }

  async save(user: User): Promise<User> {
    return this.repository.save(user);
  }

  async create(data: Partial<User>): Promise<User> {
    const user = this.repository.create(data);
    return this.repository.save(user);
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }
}

export const userRepository = new UserRepository();
