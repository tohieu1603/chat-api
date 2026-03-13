import dotenv from 'dotenv';
dotenv.config();

export const envConfig = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'chat_channel_db',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'default-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
    accessExpiration: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  cookie: {
    domain: process.env.COOKIE_DOMAIN || undefined,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: (process.env.COOKIE_SAME_SITE || 'lax') as 'lax' | 'strict' | 'none',
  },
  byteplus: {
    apiUrl: process.env.BYTEPLUS_API_URL || 'https://ark.ap-southeast.bytepluses.com/api/coding/v3',
    apiKey: process.env.BYTEPLUS_API_KEY || '',
  },
  cors: {
    // Comma-separated origins: "http://localhost:3000,http://localhost:50051"
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map(o => o.trim()),
  },
};
