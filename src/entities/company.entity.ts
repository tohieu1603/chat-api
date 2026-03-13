import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity('companies')
export class Company extends BaseEntity {
  @Column({ length: 200 })
  name!: string;

  @Column({ length: 500, nullable: true, type: 'varchar' })
  description?: string | null;

  @Column({ length: 200, nullable: true, type: 'varchar' })
  address?: string | null;

  @Column({ length: 50, nullable: true, type: 'varchar' })
  phone?: string | null;

  @Column({ name: 'token_balance', type: 'bigint', default: 0 })
  tokenBalance!: number;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @OneToMany(() => User, (user) => user.company)
  users!: User[];
}
