import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { JwtPayload } from '../../interfaces/jwt-payload.interface';
import { adminUserService } from '../../services/admin-user.service';

const batchInputSchema = {
  users: z.array(
    z.object({
      fullName: z.string().min(2).describe('Họ và tên đầy đủ của nhân viên'),
      email: z.string().email().optional().describe('Email (tự động tạo nếu bỏ trống)'),
      role: z.enum(['manager', 'employee']).describe('Vai trò: manager hoặc employee'),
      position: z.string().optional().describe('Chức vụ (tuỳ chọn)'),
    }),
  ).min(1).max(100).describe('Danh sách nhân viên cần tạo tài khoản'),
};

export function registerBatchCreateUsersTool(
  server: McpServer,
  getCaller: () => JwtPayload,
): void {
  server.tool(
    'batch_create_users',
    'Tạo nhiều tài khoản người dùng cùng lúc. '
    + 'Email tự động sinh từ họ tên + tên công ty nếu không cung cấp. '
    + 'Mật khẩu mặc định được gán tự động, yêu cầu đổi khi đăng nhập lần đầu. '
    + 'Nếu có lỗi với 1 người, hệ thống vẫn tạo người khác.',
    batchInputSchema,
    async (params) => {
      const caller = getCaller();

      if (!caller.companyId) {
        return {
          content: [{ type: 'text' as const, text: 'Lỗi: Người gọi chưa được gán vào công ty nào.' }],
          isError: true,
        };
      }

      try {
        const result = await adminUserService.batchCreateUsers(params.users, caller);

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
          isError: result.created.length === 0,
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
