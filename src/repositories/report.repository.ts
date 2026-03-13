import { AppDataSource } from '../config/database.config';
import { Report } from '../entities/report.entity';

class ReportRepository {
  private get repo() {
    return AppDataSource.getRepository(Report);
  }

  async findAll(): Promise<Report[]> {
    return this.repo.find({ order: { time: 'DESC' } });
  }

  async create(data: Partial<Report>): Promise<Report> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }
}

export const reportRepository = new ReportRepository();
