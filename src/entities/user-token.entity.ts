import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('user_tokens')
export class UserToken extends BaseEntity {
  @Column({ name: 'user_id', type: 'varchar', length: 100 })
  userId!: string;

  @Column({ type: 'bigint' })
  token!: number;

  // Log cộng/trừ token
  @Column({ type: 'varchar', length: 20, default: 'add' })
  type!: string; // 'add' | 'deduct'

  @Column({ name: 'balance_after', type: 'bigint', default: 0 })
  balanceAfter!: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description?: string | null;
}
