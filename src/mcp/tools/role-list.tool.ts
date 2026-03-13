import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { UserRole } from '../../constants/roles.constant';
import { JwtPayload } from '../../interfaces/jwt-payload.interface';

interface RoleInfo {
  role: string;
  level: number;
  description: string;
  canManage: string[];
}

const ALL_ROLES: RoleInfo[] = [
  {
    role: 'manager',
    level: 2,
    description: 'Quản lý - quản lý employee cùng company',
    canManage: ['employee'],
  },
  {
    role: 'employee',
    level: 1,
    description: 'Nhân viên - không có quyền quản lý',
    canManage: [],
  },
];

// Roles each caller can assign
const ASSIGNABLE: Record<string, string[]> = {
  [UserRole.DIRECTOR]: ['manager', 'employee'],
  [UserRole.MANAGER]: ['employee'],
};

export function registerListRolesTool(server: McpServer, getCaller: () => JwtPayload): void {
  server.tool(
    'list_roles',
    'Danh sách vai trò mà bạn có thể gán khi tạo tài khoản. '
    + 'Kết quả phụ thuộc vào quyền của người gọi: '
    + 'Director tạo được manager + employee. '
    + 'Manager chỉ tạo được employee.',
    {},
    async () => {
      const caller = getCaller();
      const allowed = ASSIGNABLE[caller.role] || [];
      const filtered = ALL_ROLES.filter((r) => allowed.includes(r.role));

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(filtered, null, 2),
          },
        ],
      };
    },
  );
}
