import { userRepository } from '../repositories/user.repository';
import { hashPassword } from '../utils/password.util';
import { AppError } from '../utils/app-error.util';
import { AUTH_ERRORS, USER_ERRORS } from '../constants/error-messages.constant';
import { UserRole } from '../constants/roles.constant';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from '../dtos/user.dto';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

// Roles a manager is allowed to assign (cannot create admin or other managers)
const MANAGER_ALLOWED_ROLES: UserRole[] = [UserRole.DIRECTOR, UserRole.EMPLOYEE];

export class AdminUserService {
  /**
   * Get all users.
   * Admin: sees all users.
   * Manager: sees only users in their company.
   */
  async getAllUsers(
    page: number,
    limit: number,
    caller: JwtPayload,
  ): Promise<{ data: UserResponseDto[]; total: number; page: number; limit: number }> {
    let users: any[];
    let total: number;

    if (caller.role === UserRole.ADMIN) {
      [users, total] = await userRepository.findAllPaginated(page, limit);
    } else {
      // Manager: scoped to their company
      if (!caller.companyId) throw AppError.forbidden('You are not assigned to any company');
      [users, total] = await userRepository.findByCompanyPaginated(caller.companyId, page, limit);
    }

    return { data: users.map(UserResponseDto.fromEntity), total, page, limit };
  }

  /**
   * Get user by ID.
   * Admin: any user.
   * Manager: only users in their company.
   */
  async getUserById(id: string, caller: JwtPayload): Promise<UserResponseDto> {
    const user = caller.role === UserRole.ADMIN
      ? await userRepository.findById(id)
      : caller.companyId
        ? await userRepository.findByIdAndCompany(id, caller.companyId)
        : null;

    if (!user) throw AppError.notFound(USER_ERRORS.not_found);
    return UserResponseDto.fromEntity(user);
  }

  /**
   * Create user.
   * Admin: any role, any company.
   * Manager: only director/employee roles, forced to their company.
   */
  async createUser(dto: CreateUserDto, caller: JwtPayload): Promise<UserResponseDto> {
    const existing = await userRepository.findByEmail(dto.email);
    if (existing) throw AppError.conflict(AUTH_ERRORS.email_taken);

    // Manager restrictions
    if (caller.role === UserRole.MANAGER) {
      if (!MANAGER_ALLOWED_ROLES.includes(dto.role)) {
        throw AppError.forbidden('Managers can only create director or employee accounts');
      }
      if (!caller.companyId) throw AppError.forbidden('You are not assigned to any company');
      // Force company to manager's company
      dto.companyId = caller.companyId;
    }

    const hashedPassword = await hashPassword(dto.password);
    const user = await userRepository.create({
      email: dto.email,
      password: hashedPassword,
      fullName: dto.fullName,
      role: dto.role,
      position: dto.position || null,
      companyId: dto.companyId || null,
      isActive: true,
    });

    return UserResponseDto.fromEntity(user);
  }

  /**
   * Update user.
   * Admin: any user, any field.
   * Manager: only users in their company (that they can see), cannot change role to admin/manager.
   */
  async updateUser(id: string, dto: UpdateUserDto, caller: JwtPayload): Promise<UserResponseDto> {
    let user;

    if (caller.role === UserRole.ADMIN) {
      user = await userRepository.findById(id);
    } else {
      if (!caller.companyId) throw AppError.forbidden('You are not assigned to any company');
      user = await userRepository.findByIdAndCompany(id, caller.companyId);

      // Manager cannot change role to admin/manager
      if (dto.role && !MANAGER_ALLOWED_ROLES.includes(dto.role)) {
        throw AppError.forbidden('Managers can only assign director or employee roles');
      }
      // Manager cannot move user to another company
      if (dto.companyId && dto.companyId !== caller.companyId) {
        throw AppError.forbidden('Managers cannot move users to another company');
      }
    }

    if (!user) throw AppError.notFound(USER_ERRORS.not_found);

    if (dto.email && dto.email !== user.email) {
      const existing = await userRepository.findByEmail(dto.email);
      if (existing) throw AppError.conflict(AUTH_ERRORS.email_taken);
      user.email = dto.email;
    }

    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.position !== undefined) user.position = dto.position;
    if (dto.companyId !== undefined && caller.role === UserRole.ADMIN) user.companyId = dto.companyId;

    const saved = await userRepository.save(user);
    return UserResponseDto.fromEntity(saved);
  }

  /**
   * Delete user.
   * Admin: any user (except self).
   * Manager: only users in their company (except self).
   */
  async deleteUser(id: string, caller: JwtPayload): Promise<void> {
    if (id === caller.userId) {
      throw AppError.badRequest(USER_ERRORS.cannot_delete_self);
    }

    let user;
    if (caller.role === UserRole.ADMIN) {
      user = await userRepository.findById(id);
    } else {
      if (!caller.companyId) throw AppError.forbidden('You are not assigned to any company');
      user = await userRepository.findByIdAndCompany(id, caller.companyId);
    }

    if (!user) throw AppError.notFound(USER_ERRORS.not_found);

    // Manager cannot delete admin or other managers
    if (caller.role === UserRole.MANAGER && !MANAGER_ALLOWED_ROLES.includes(user.role)) {
      throw AppError.forbidden('Managers cannot delete admin or manager accounts');
    }

    await userRepository.softDelete(id);
  }
}

export const adminUserService = new AdminUserService();
