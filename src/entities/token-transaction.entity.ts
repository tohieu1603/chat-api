import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

export type TransactionType = 'credit' | 'debit' | 'adjustment';

@Entity('token_transactions')
export class TokenTransaction extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'varchar', length: 20 })
  type!: TransactionType;

  @Column({ type: 'bigint' })
  amount!: number;

  @Column({ name: 'balance_after', type: 'bigint' })
  balanceAfter!: number;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'reference_id', type: 'varchar', length: 100, nullable: true })
  referenceId?: string | null;
}
