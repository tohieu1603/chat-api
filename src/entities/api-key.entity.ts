import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity('api_keys')
export class ApiKey extends BaseEntity {
  // Descriptive name for the key (e.g. "Production Server", "CI/CD Pipeline")
  @Column()
  name!: string;

  // Only first 8 chars stored as prefix for identification (e.g. "ck_a1b2c3d4")
  @Column({ name: 'key_prefix' })
  keyPrefix!: string;

  // SHA-256 hash of the full API key - never store raw key
  @Column({ name: 'key_hash', unique: true })
  keyHash!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt?: Date | null;

  @Column({ name: 'last_used_at', type: 'timestamp', nullable: true })
  lastUsedAt?: Date | null;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'revoked_at', type: 'timestamp', nullable: true })
  revokedAt?: Date | null;

  @Column({ name: 'revoked_reason', type: 'varchar', nullable: true })
  revokedReason?: string | null;

  get isRevoked(): boolean {
    return this.revokedAt !== null && this.revokedAt !== undefined;
  }

  get isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
  }
}
