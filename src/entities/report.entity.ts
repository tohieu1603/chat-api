import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('reports')
export class Report extends BaseEntity {
  @Column({ length: 100 })
  username!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  time!: Date;
}
