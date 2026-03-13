import { reportRepository } from '../repositories/report.repository';
import { CreateReportDto, ReportResponseDto } from '../dtos/report.dto';

export class ReportService {
  async getAll(): Promise<ReportResponseDto[]> {
    const reports = await reportRepository.findAll();
    return reports.map(ReportResponseDto.fromEntity);
  }

  async create(dto: CreateReportDto): Promise<ReportResponseDto> {
    const report = await reportRepository.create({
      username: dto.username,
      message: dto.message,
      time: dto.time ? new Date(dto.time) : new Date(),
    });
    return ReportResponseDto.fromEntity(report);
  }
}

export const reportService = new ReportService();
