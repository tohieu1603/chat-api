import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity('refresh_tokens')
export class RefreshToken extends BaseEntity {
  // Hashed token value - never store raw
  @Column({ name: 'token_hash' })
  tokenHash!: string;

  // Token rotation family - all tokens in same login session share a family
  // When reuse detected (revoked token used), revoke entire family
  @Column({ name: 'family' })
  family!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt!: Date;

  @Column({ name: 'revoked_at', type: 'timestamp', nullable: true })
  revokedAt?: Date | null;

  // Reason for revocation: 'logout', 'token_rotation', 'security_breach', 'admin_revoke', 'expired'
  @Column({ name: 'revoked_reason', type: 'varchar', nullable: true })
  revokedReason?: string | null;

  // IP/User-Agent for audit trail
  @Column({ name: 'user_agent', type: 'varchar', nullable: true })
  userAgent?: string | null;

  @Column({ name: 'ip_address', type: 'varchar', nullable: true })
  ipAddress?: string | null;

  get isRevoked(): boolean {
    return this.revokedAt !== null && this.revokedAt !== undefined;
  }

  get isExpired(): boolean {
    return new Date() > this.expiresAt;
  }
}
