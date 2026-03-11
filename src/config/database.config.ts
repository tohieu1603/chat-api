import { DataSource } from 'typeorm';
import { envConfig } from './env.config';

const isDev = envConfig.nodeEnv === 'development';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: envConfig.db.host,
  port: envConfig.db.port,
  username: envConfig.db.username,
  password: envConfig.db.password,
  database: envConfig.db.database,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: isDev,
  logging: isDev,
  ssl: false,
});
