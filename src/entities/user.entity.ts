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

  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId?: string | null;

  @ManyToOne(() => Company, (company) => company.users, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'company_id' })
  company?: Company | null;

  @BeforeInsert()
  @BeforeUpdate()
  normalizeEmail(): void {
    if (this.email) {
      this.email = this.email.toLowerCase().trim();
    }
  }
}
