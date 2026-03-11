import { userRepository } from '../repositories/user.repository';
import { hashPassword } from '../utils/password.util';
import { AppError } from '../utils/app-error.util';
import { AUTH_ERRORS, USER_ERRORS } from '../constants/error-messages.constant';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from '../dtos/user.dto';

export class AdminUserService {
  async getAllUsers(page: number, limit: number): Promise<{ data: UserResponseDto[]; total: number; page: number; limit: number }> {
    const [users, total] = await userRepository.findAllPaginated(page, limit);
    return {
      data: users.map(UserResponseDto.fromEntity),
      total,
      page,
      limit,
    };
  }

  async getUserById(id: string): Promise<UserResponseDto> {
    const user = await userRepository.findById(id);
    if (!user) {
      throw AppError.notFound(USER_ERRORS.not_found);
    }
    return UserResponseDto.fromEntity(user);
  }

  async createUser(dto: CreateUserDto): Promise<UserResponseDto> {
    const existing = await userRepository.findByEmail(dto.email);
    if (existing) {
      throw AppError.conflict(AUTH_ERRORS.email_taken);
    }

    const hashedPassword = await hashPassword(dto.password);
    const user = await userRepository.create({
      email: dto.email,
      password: hashedPassword,
      fullName: dto.fullName,
      role: dto.role,
      isActive: true,
    });

    return UserResponseDto.fromEntity(user);
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await userRepository.findById(id);
    if (!user) {
      throw AppError.notFound(USER_ERRORS.not_found);
    }

    if (dto.email && dto.email !== user.email) {
      const existing = await userRepository.findByEmail(dto.email);
      if (existing) {
        throw AppError.conflict(AUTH_ERRORS.email_taken);
      }
      user.email = dto.email;
    }

    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;

    const saved = await userRepository.save(user);
    return UserResponseDto.fromEntity(saved);
  }

  async deleteUser(id: string, currentUserId: string): Promise<void> {
    if (id === currentUserId) {
      throw AppError.badRequest(USER_ERRORS.cannot_delete_self);
    }

    const user = await userRepository.findById(id);
    if (!user) {
      throw AppError.notFound(USER_ERRORS.not_found);
    }

    await userRepository.softDelete(id);
  }
}

export const adminUserService = new AdminUserService();
