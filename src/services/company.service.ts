import { companyRepository } from '../repositories/company.repository';
import { AppError } from '../utils/app-error.util';
import { CreateCompanyDto, UpdateCompanyDto, CompanyResponseDto } from '../dtos/company.dto';

const COMPANY_ERRORS = {
  not_found: 'Company not found',
  name_taken: 'Company name already exists',
};

export class CompanyService {
  async getAll(): Promise<CompanyResponseDto[]> {
    const companies = await companyRepository.findAll();
    return companies.map(CompanyResponseDto.fromEntity);
  }

  async getById(id: string): Promise<CompanyResponseDto> {
    const company = await companyRepository.findById(id);
    if (!company) throw AppError.notFound(COMPANY_ERRORS.not_found);
    return CompanyResponseDto.fromEntity(company);
  }

  async create(dto: CreateCompanyDto): Promise<CompanyResponseDto> {
    const existing = await companyRepository.findByName(dto.name);
    if (existing) throw AppError.conflict(COMPANY_ERRORS.name_taken);

    const company = await companyRepository.create({
      name: dto.name,
      description: dto.description,
      address: dto.address,
      phone: dto.phone,
    });
    return CompanyResponseDto.fromEntity(company);
  }

  async update(id: string, dto: UpdateCompanyDto): Promise<CompanyResponseDto> {
    const company = await companyRepository.findById(id);
    if (!company) throw AppError.notFound(COMPANY_ERRORS.not_found);

    if (dto.name && dto.name !== company.name) {
      const existing = await companyRepository.findByName(dto.name);
      if (existing) throw AppError.conflict(COMPANY_ERRORS.name_taken);
    }

    Object.assign(company, dto);
    const updated = await companyRepository.save(company);
    return CompanyResponseDto.fromEntity(updated);
  }

  async delete(id: string): Promise<void> {
    const company = await companyRepository.findById(id);
    if (!company) throw AppError.notFound(COMPANY_ERRORS.not_found);
    await companyRepository.softDelete(id);
  }
}

export const companyService = new CompanyService();
