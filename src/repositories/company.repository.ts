import { AppDataSource } from '../config/database.config';
import { Company } from '../entities/company.entity';

class CompanyRepository {
  private get repo() {
    return AppDataSource.getRepository(Company);
  }

  async findAll(): Promise<Company[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<Company | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByName(name: string): Promise<Company | null> {
    return this.repo.findOne({ where: { name } });
  }

  async create(data: Partial<Company>): Promise<Company> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async save(company: Company): Promise<Company> {
    return this.repo.save(company);
  }

  async softDelete(id: string): Promise<void> {
    await this.repo.softDelete(id);
  }
}

export const companyRepository = new CompanyRepository();
