import { Entity, Column, BeforeInsert, BeforeUpdate, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { UserRole } from '../constants/roles.constant';
import { Company } from './company.entity';

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  email!: string;

  @Column({ select: false })
  password!: string;

  @Column({ name: 'full_name' })
  fullName!: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.EMPLOYEE })
  role!: UserRole;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  position?: string | null;

  @Column({ name: 'token_balance', type: 'bigint', default: 0 })
  tokenBalance!: number;

  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId?: string | null;

  @ManyToOne(() => Company, (company) => company.users, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'company_id' })
  company?: Company | null;

  @Column({ name: 'must_change_password', default: false })
  mustChangePassword!: boolean;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  creator?: User | null;

  @BeforeInsert()
  @BeforeUpdate()
  normalizeEmail(): void {
    if (this.email) {
      this.email = this.email.toLowerCase().trim();
    }
  }
}
