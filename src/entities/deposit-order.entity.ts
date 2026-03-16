import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

export type DepositType = 'token' | 'order';
export type DepositStatus = 'pending' | 'completed' | 'expired' | 'cancelled';

@Entity('deposit_orders')
export class DepositOrder extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'order_code', length: 20, unique: true })
  orderCode!: string;

  @Column({ type: 'varchar', length: 10, default: 'token' })
  type!: DepositType;

  @Column({ name: 'token_amount', type: 'bigint', default: 0 })
  tokenAmount!: number;

  @Column({ name: 'amount_vnd', type: 'int' })
  amountVnd!: number;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: DepositStatus;

  @Column({ name: 'payment_method', type: 'varchar', length: 50, nullable: true })
  paymentMethod?: string | null;

  @Column({ name: 'payment_reference', type: 'varchar', length: 100, nullable: true })
  paymentReference?: string | null;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt?: Date | null;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt!: Date;
}
