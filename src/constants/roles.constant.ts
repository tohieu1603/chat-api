export enum UserRole {
  ADMIN = 'admin',
  DIRECTOR = 'director',
  EMPLOYEE = 'employee',
}

// Role hierarchy: higher number = more privilege
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.EMPLOYEE]: 1,
  [UserRole.DIRECTOR]: 2,
  [UserRole.ADMIN]: 3,
};
