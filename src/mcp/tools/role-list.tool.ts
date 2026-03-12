import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

interface RoleInfo {
  role: string;
  level: number;
  description: string;
  canManage: string[];
}

const ROLES: RoleInfo[] = [
  {
    role: 'director',
    level: 3,
    description: 'Giám đốc company - quản lý manager và employee cùng company',
    canManage: ['manager', 'employee'],
  },
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

export function registerListRolesTool(server: McpServer): void {
  server.tool(
    'list_roles',
    'Danh sách vai trò có thể gán khi tạo tài khoản. '
    + 'Director (giám đốc) quản lý manager + employee. '
    + 'Manager (quản lý) quản lý employee. '
    + 'Employee (nhân viên) không có quyền quản lý. '
    + 'KHÔNG bao gồm admin (chỉ dùng hệ thống).',
    {},
    async () => ({
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(ROLES, null, 2),
        },
      ],
    }),
  );
}
