import { IsString, MaxLength, MinLength, IsOptional, IsDateString } from 'class-validator';
import { Report } from '../entities/report.entity';

export class CreateReportDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  username!: string;

  @IsString()
  @MinLength(1)
  message!: string;

  @IsOptional()
  @IsDateString()
  time?: string;
}

export class ReportResponseDto {
  id!: string;
  username!: string;
  message!: string;
  time!: Date;
  createdAt!: Date;

  static fromEntity(entity: Report): ReportResponseDto {
    const dto = new ReportResponseDto();
    dto.id = entity.id;
    dto.username = entity.username;
    dto.message = entity.message;
    dto.time = entity.time;
    dto.createdAt = entity.createdAt;
    return dto;
  }
}
