import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { userRepository } from '../repositories/user.repository';
import { refreshTokenRepository } from '../repositories/refresh-token.repository';
import { hashPassword, comparePassword } from '../utils/password.util';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.util';
import { AppError } from '../utils/app-error.util';
import { AUTH_ERRORS, USER_ERRORS } from '../constants/error-messages.constant';
import { UserRole } from '../constants/roles.constant';
import { RegisterDto, LoginDto } from '../dtos/auth.dto';
import { UserResponseDto } from '../dtos/user.dto';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

const REFRESH_TOKEN_SALT = 10;
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface AuthTokenResult {
  user: UserResponseDto;
  accessToken: string;
  refreshToken: string;
}

interface TokenMeta {
  userAgent?: string;
  ipAddress?: string;
}

export class AuthService {
  private buildPayload(user: { id: string; email: string; role: UserRole; companyId?: string | null }): JwtPayload {
    return { userId: user.id, email: user.email, role: user.role, companyId: user.companyId ?? null };
  }

  /**
   * Generate tokens and persist refresh token in separate table.
   * Each login creates a new "family" for token rotation detection.
   */
  private async generateAndStoreTokens(
    user: { id: string; email: string; role: UserRole; companyId?: string | null },
    family: string,
    meta?: TokenMeta,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = this.buildPayload(user);
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    const tokenHash = await bcrypt.hash(refreshToken, REFRESH_TOKEN_SALT);

    await refreshTokenRepository.create({
      tokenHash,
      family,
      userId: user.id,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      userAgent: meta?.userAgent || null,
      ipAddress: meta?.ipAddress || null,
    });

    return { accessToken, refreshToken };
  }

  async register(dto: RegisterDto, meta?: TokenMeta): Promise<AuthTokenResult> {
    const existing = await userRepository.findByEmail(dto.email);
    if (existing) {
      throw AppError.conflict(AUTH_ERRORS.email_taken);
    }

    const hashedPassword = await hashPassword(dto.password);
    const user = await userRepository.create({
      email: dto.email,
      password: hashedPassword,
      fullName: dto.fullName,
      role: UserRole.EMPLOYEE,
      isActive: true,
    });

    const family = uuidv4();
    const { accessToken, refreshToken } = await this.generateAndStoreTokens(user, family, meta);
    return { user: UserResponseDto.fromEntity(user), accessToken, refreshToken };
  }

  async login(dto: LoginDto, meta?: TokenMeta): Promise<AuthTokenResult> {
    const user = await userRepository.findByEmail(dto.email);
    if (!user) {
      throw AppError.unauthorized(AUTH_ERRORS.invalid_credentials);
    }

    const isMatch = await comparePassword(dto.password, user.password);
    if (!isMatch) {
      throw AppError.unauthorized(AUTH_ERRORS.invalid_credentials);
    }

    if (!user.isActive) {
      throw AppError.forbidden(AUTH_ERRORS.forbidden);
    }

    const family = uuidv4();
    const { accessToken, refreshToken } = await this.generateAndStoreTokens(user, family, meta);
    return { user: UserResponseDto.fromEntity(user), accessToken, refreshToken };
  }

  async logout(userId: string): Promise<void> {
    await refreshTokenRepository.revokeAllByUserId(userId, 'logout');
  }

  /**
   * Refresh token rotation with family-based reuse detection.
   * Revoked token reuse → entire family revoked (potential theft).
   */
  async refreshTokens(currentRefreshToken: string, meta?: TokenMeta): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = verifyRefreshToken(currentRefreshToken);

    const user = await userRepository.findById(payload.userId);
    if (!user || !user.isActive) {
      throw AppError.unauthorized(AUTH_ERRORS.refresh_token_invalid);
    }

    // Find active tokens for this user and match hash
    const activeTokens = await refreshTokenRepository.findActiveByUserId(payload.userId);
    let matchedToken = null;
    for (const token of activeTokens) {
      const isMatch = await bcrypt.compare(currentRefreshToken, token.tokenHash);
      if (isMatch) {
        matchedToken = token;
        break;
      }
    }

    if (!matchedToken) {
      // Reuse of revoked token detected → revoke all (security breach)
      await refreshTokenRepository.revokeAllByUserId(payload.userId, 'security_breach');
      throw AppError.unauthorized(AUTH_ERRORS.refresh_token_invalid);
    }

    if (matchedToken.isExpired) {
      await refreshTokenRepository.revoke(matchedToken.id, 'expired');
      throw AppError.unauthorized(AUTH_ERRORS.token_expired);
    }

    // Rotate: revoke old, issue new in same family
    await refreshTokenRepository.revoke(matchedToken.id, 'token_rotation');
    return this.generateAndStoreTokens(user, matchedToken.family, meta);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await userRepository.findByIdWithPassword(userId);
    if (!user) throw AppError.notFound(USER_ERRORS.not_found);

    const isMatch = await comparePassword(currentPassword, user.password);
    if (!isMatch) throw AppError.badRequest(AUTH_ERRORS.wrong_password);

    const isSame = await comparePassword(newPassword, user.password);
    if (isSame) throw AppError.badRequest(AUTH_ERRORS.same_password);

    user.password = await hashPassword(newPassword);
    user.mustChangePassword = false;
    await userRepository.save(user);

    // Invalidate all existing refresh tokens after password change
    await refreshTokenRepository.revokeAllByUserId(userId, 'password_change');
  }

  async getProfile(userId: string): Promise<UserResponseDto> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound(USER_ERRORS.not_found);
    }
    return UserResponseDto.fromEntity(user);
  }
}

export const authService = new AuthService();
