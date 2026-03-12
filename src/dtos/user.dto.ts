import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsEnum, IsBoolean, IsUUID } from 'class-validator';
import { UserRole } from '../constants/roles.constant';
import { User } from '../entities/user.entity';

export class CreateUserDto {
  @IsEmail({}, { message: 'Invalid email format' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(100)
  password!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;

  @IsEnum(UserRole, { message: 'Invalid user role' })
  role!: UserRole;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  position?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Invalid company ID' })
  companyId?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName?: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'Invalid user role' })
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  position?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Invalid company ID' })
  companyId?: string;
}

export class UserResponseDto {
  id!: string;
  email!: string;
  fullName!: string;
  role!: UserRole;
  isActive!: boolean;
  position?: string | null;
  companyId?: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  static fromEntity(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.fullName = user.fullName;
    dto.role = user.role;
    dto.isActive = user.isActive;
    dto.position = user.position ?? null;
    dto.companyId = user.companyId ?? null;
    dto.createdAt = user.createdAt;
    dto.updatedAt = user.updatedAt;
    return dto;
  }
}
