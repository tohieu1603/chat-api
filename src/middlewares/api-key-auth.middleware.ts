import { Request, Response, NextFunction } from 'express';
import { apiKeyService } from '../services/api-key.service';
import { userRepository } from '../repositories/user.repository';
import { AppError } from '../utils/app-error.util';
import { AUTH_ERRORS } from '../constants/error-messages.constant';

const API_KEY_HEADER = 'x-api-key';

/**
 * Authenticate request via API key (x-api-key header).
 * Sets req.user with userId, email, role from the key owner.
 */
export async function authenticateApiKey(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const apiKey = req.headers[API_KEY_HEADER] as string | undefined;

  if (!apiKey) {
    return next(AppError.unauthorized('API key is required'));
  }

  try {
    const result = await apiKeyService.validateKey(apiKey);
    if (!result) {
      return next(AppError.unauthorized('Invalid or expired API key'));
    }

    const user = await userRepository.findById(result.userId);
    if (!user || !user.isActive) {
      return next(AppError.unauthorized(AUTH_ERRORS.forbidden));
    }

    req.user = { userId: user.id, email: user.email, role: user.role };
    next();
  } catch (err) {
    next(err);
  }
}
