export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  DIRECTOR = 'director',
  EMPLOYEE = 'employee',
}

// Role hierarchy: higher number = more privilege
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.EMPLOYEE]: 1,
  [UserRole.DIRECTOR]: 2,
  [UserRole.MANAGER]: 3,
  [UserRole.ADMIN]: 4,
};
