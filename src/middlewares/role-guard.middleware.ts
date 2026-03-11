import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../constants/roles.constant';
import { AppError } from '../utils/app-error.util';
import { AUTH_ERRORS } from '../constants/error-messages.constant';

export function authorizeRoles(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized(AUTH_ERRORS.unauthorized));
    }

    if (!roles.includes(req.user.role)) {
      return next(AppError.forbidden(AUTH_ERRORS.forbidden));
    }

    next();
  };
}
