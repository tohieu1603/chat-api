import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { userRepository } from '../../repositories/user.repository';
import { hashPassword } from '../../utils/password.util';
import { generateEmail } from '../../utils/email-generator.util';
import { envConfig } from '../../config/env.config';
import { UserRole } from '../../constants/roles.constant';
import { UserResponseDto } from '../../dtos/user.dto';
import { JwtPayload } from '../../interfaces/jwt-payload.interface';
import { AppDataSource } from '../../config/database.config';
import { Company } from '../../entities/company.entity';

// Roles each caller level can create (same logic as admin-user.service)
const ALLOWED_ROLES: Record<string, UserRole[]> = {
  [UserRole.DIRECTOR]: [UserRole.MANAGER, UserRole.EMPLOYEE],
  [UserRole.MANAGER]: [UserRole.EMPLOYEE],
};

const inputSchema = {
  email: z
    .string()
    .email()
    .optional()
    .describe('Email tài khoản. Nếu bỏ trống, hệ thống tự tạo từ họ tên + tên công ty.'),
  fullName: z
    .string()
    .min(2)
    .describe('Họ và tên đầy đủ của người dùng (bắt buộc).'),
  role: z
    .enum(['manager', 'employee'])
    .describe(
      'Vai trò: '
      + '"manager" = quản lý (quản lý employee cùng company), '
      + '"employee" = nhân viên (không có quyền quản lý). '
      + 'Lưu ý: Director chỉ có thể tạo manager hoặc employee. Manager chỉ có thể tạo employee.',
    ),
  position: z
    .string()
    .optional()
    .describe('Chức vụ cụ thể, ví dụ: "Trưởng phòng IT", "Nhân viên kỹ thuật".'),
};

export function registerCreateUserTool(server: McpServer, getCaller: () => JwtPayload): void {
  server.tool(
    'create_user_account',
    'Tạo tài khoản người dùng mới trong cùng công ty với người gọi. '
    + 'Mật khẩu mặc định được gán tự động, người dùng phải đổi mật khẩu khi đăng nhập lần đầu. '
    + 'Email có thể bỏ trống để hệ thống tự sinh từ họ tên + tên công ty. '
    + 'Director tạo được manager + employee. Manager chỉ tạo được employee.',
    inputSchema,
    async (params) => {
      const caller = getCaller();

      if (!caller.companyId) {
        return {
          content: [{ type: 'text' as const, text: 'Lỗi: Người gọi chưa được gán vào công ty nào.' }],
          isError: true,
        };
      }

      // Validate caller can create this role
      const allowedRoles = ALLOWED_ROLES[caller.role] || [];
      if (!allowedRoles.includes(params.role as UserRole)) {
        return {
          content: [{ type: 'text' as const, text: `Lỗi: Bạn (${caller.role}) không có quyền tạo tài khoản với vai trò "${params.role}".` }],
          isError: true,
        };
      }

      try {
        // Resolve email
        let email = params.email;
        if (!email) {
          const companyRepo = AppDataSource.getRepository(Company);
          const company = await companyRepo.findOne({ where: { id: caller.companyId } });
          if (!company) {
            return {
              content: [{ type: 'text' as const, text: 'Lỗi: Không tìm thấy công ty.' }],
              isError: true,
            };
          }

          email = await generateEmail(
            params.fullName,
            company.name,
            async (candidate) => {
              const existing = await userRepository.findByEmail(candidate);
              return existing !== null;
            },
          );
        }

        // Check email uniqueness
        const existing = await userRepository.findByEmail(email);
        if (existing) {
          return {
            content: [{ type: 'text' as const, text: `Lỗi: Email "${email}" đã được sử dụng.` }],
            isError: true,
          };
        }

        // Create user with default password
        const hashedPassword = await hashPassword(envConfig.defaultUserPassword);
        const user = await userRepository.create({
          email,
          password: hashedPassword,
          fullName: params.fullName,
          role: params.role as UserRole,
          position: params.position || null,
          companyId: caller.companyId,
          mustChangePassword: true,
          createdBy: caller.userId,
          isActive: true,
        });

        const response = UserResponseDto.fromEntity(user);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [{ type: 'text' as const, text: `Lỗi: ${error.message || 'Không thể tạo tài khoản.'}` }],
          isError: true,
        };
      }
    },
  );
}
