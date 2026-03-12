import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.util';
import { apiKeyService } from '../services/api-key.service';
import { userRepository } from '../repositories/user.repository';
import { AppError } from '../utils/app-error.util';
import { AUTH_ERRORS } from '../constants/error-messages.constant';

const API_KEY_HEADER = 'x-api-key';

/**
 * Authenticate via cookie (access_token) OR API key (x-api-key header).
 * Priority: cookie first → API key fallback.
 */
export async function authenticateToken(req: Request, _res: Response, next: NextFunction): Promise<void> {
  // 1. Try cookie-based JWT auth
  const cookieToken = req.cookies?.access_token as string | undefined;
  if (cookieToken) {
    try {
      req.user = verifyAccessToken(cookieToken);
      return next();
    } catch {
      // Cookie token invalid/expired - fall through to API key
    }
  }

  // 2. Try API key auth
  const apiKey = req.headers[API_KEY_HEADER] as string | undefined;
  if (apiKey) {
    try {
      const result = await apiKeyService.validateKey(apiKey);
      if (result) {
        const user = await userRepository.findById(result.userId);
        if (user && user.isActive) {
          req.user = { userId: user.id, email: user.email, role: user.role, companyId: user.companyId ?? null };
          return next();
        }
      }
    } catch {
      // API key validation failed - fall through to unauthorized
    }
  }

  // 3. Neither method succeeded
  return next(AppError.unauthorized(AUTH_ERRORS.unauthorized));
}
