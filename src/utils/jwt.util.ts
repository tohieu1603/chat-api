import jwt from 'jsonwebtoken';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { AppError } from './app-error.util';
import { AUTH_ERRORS } from '../constants/error-messages.constant';
import { envConfig } from '../config/env.config';

export const generateAccessToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, envConfig.jwt.accessSecret, {
    expiresIn: envConfig.jwt.accessExpiration,
  } as jwt.SignOptions);
};

export const generateRefreshToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, envConfig.jwt.refreshSecret, {
    expiresIn: envConfig.jwt.refreshExpiration,
  } as jwt.SignOptions);
};

export const verifyAccessToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, envConfig.jwt.accessSecret) as JwtPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw AppError.unauthorized(AUTH_ERRORS.token_expired);
    }
    throw AppError.unauthorized(AUTH_ERRORS.token_invalid);
  }
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, envConfig.jwt.refreshSecret) as JwtPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw AppError.unauthorized(AUTH_ERRORS.token_expired);
    }
    throw AppError.unauthorized(AUTH_ERRORS.refresh_token_invalid);
  }
};
