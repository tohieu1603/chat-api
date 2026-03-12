export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  DIRECTOR = 'director',
  EMPLOYEE = 'employee',
}

// Role hierarchy: higher number = more privilege
// director (giám đốc) outranks manager (quản lý)
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.EMPLOYEE]: 1,
  [UserRole.MANAGER]: 2,
  [UserRole.DIRECTOR]: 3,
  [UserRole.ADMIN]: 4,
};
