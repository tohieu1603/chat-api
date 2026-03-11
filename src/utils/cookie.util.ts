import { Response } from 'express';
import { envConfig } from '../config/env.config';

const ACCESS_TOKEN_COOKIE = 'access_token';
const REFRESH_TOKEN_COOKIE = 'refresh_token';

export const cookieUtil = {
  setAccessToken(res: Response, token: string): void {
    res.cookie(ACCESS_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: envConfig.cookie.secure,
      sameSite: envConfig.cookie.sameSite,
      domain: envConfig.cookie.domain,
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });
  },

  setRefreshToken(res: Response, token: string): void {
    res.cookie(REFRESH_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: envConfig.cookie.secure,
      sameSite: envConfig.cookie.sameSite,
      domain: envConfig.cookie.domain,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });
  },

  setTokens(res: Response, accessToken: string, refreshToken: string): void {
    this.setAccessToken(res, accessToken);
    this.setRefreshToken(res, refreshToken);
  },

  clearTokens(res: Response): void {
    const opts = {
      httpOnly: true,
      secure: envConfig.cookie.secure,
      sameSite: envConfig.cookie.sameSite as 'strict' | 'lax' | 'none' | boolean,
      domain: envConfig.cookie.domain,
      path: '/',
    };
    res.clearCookie(ACCESS_TOKEN_COOKIE, opts);
    res.clearCookie(REFRESH_TOKEN_COOKIE, opts);
  },
};
