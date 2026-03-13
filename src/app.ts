import 'reflect-metadata';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { envConfig } from './config/env.config';
import { swaggerSpec } from './config/swagger.config';
import { errorHandler, requestLogger, mcpRateLimiter } from './middlewares';
import authRoutes from './routes/auth.routes';
import adminUserRoutes from './routes/admin-user.routes';
import apiKeyRoutes from './routes/api-key.routes';
import companyRoutes from './routes/company.routes';
import byteplusProxyRoutes from './routes/byteplus-proxy.routes';
import mcpRouter from './mcp/mcp-router';
import reportRoutes from './routes/report.routes';
import depositRoutes from './routes/deposit.routes';
import userTokenRoutes from './routes/user-token.routes';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({ origin: envConfig.cors.origin, credentials: true }));
app.use(cookieParser());

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(requestLogger);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Swagger docs
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api/docs.json', (_req, res) => {
  res.json(swaggerSpec);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/api-keys', apiKeyRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/byteplus', byteplusProxyRoutes);
app.use('/mcp', mcpRateLimiter, mcpRouter);
app.use('/api/reports', reportRoutes);
app.use('/api/deposits', depositRoutes);
app.use('/api/user-tokens', userTokenRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Đường dẫn không tồn tại' });
});

// Error handler (must be last)
app.use(errorHandler);

export { app };
