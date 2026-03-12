import { UserRole } from '../constants/roles.constant';

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  companyId?: string | null;
}
