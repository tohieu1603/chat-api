import { IsString, IsOptional, MaxLength, MinLength, IsBoolean } from 'class-validator';
import { Company } from '../entities/company.entity';

export class CreateCompanyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;
}

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CompanyResponseDto {
  id!: string;
  name!: string;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  static fromEntity(entity: Company): CompanyResponseDto {
    const dto = new CompanyResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.description = entity.description;
    dto.address = entity.address;
    dto.phone = entity.phone;
    dto.isActive = entity.isActive;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
