import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { cookieUtil } from '../utils/cookie.util';
import { responseUtil } from '../utils/response.util';
import { AppError } from '../utils/app-error.util';
import { AUTH_ERRORS } from '../constants/error-messages.constant';
import { RegisterDto, LoginDto, ChangePasswordDto } from '../dtos/auth.dto';

function extractMeta(req: Request) {
  return {
    userAgent: req.headers['user-agent'] || undefined,
    ipAddress: req.ip || req.socket.remoteAddress || undefined,
  };
}

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = req.body as RegisterDto;
      const result = await authService.register(dto, extractMeta(req));
      cookieUtil.setTokens(res, result.accessToken, result.refreshToken);
      responseUtil.created(res, result.user);
    } catch (err) {
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = req.body as LoginDto;
      const result = await authService.login(dto, extractMeta(req));
      cookieUtil.setTokens(res, result.accessToken, result.refreshToken);
      responseUtil.success(res, result.user, 'Đăng nhập thành công');
    } catch (err) {
      next(err);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.logout(req.user!.userId);
      cookieUtil.clearTokens(res);
      responseUtil.success(res, null, 'Đăng xuất thành công');
    } catch (err) {
      next(err);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.refresh_token as string | undefined;
      if (!refreshToken) {
        return next(AppError.unauthorized(AUTH_ERRORS.refresh_token_invalid));
      }
      const tokens = await authService.refreshTokens(refreshToken, extractMeta(req));
      cookieUtil.setTokens(res, tokens.accessToken, tokens.refreshToken);
      responseUtil.success(res, null, 'Làm mới phiên đăng nhập thành công');
    } catch (err) {
      next(err);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body as ChangePasswordDto;
      await authService.changePassword(req.user!.userId, currentPassword, newPassword);
      responseUtil.success(res, null, 'Đổi mật khẩu thành công');
    } catch (err) {
      next(err);
    }
  }

  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.getProfile(req.user!.userId);
      responseUtil.success(res, user);
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
