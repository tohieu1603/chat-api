import 'reflect-metadata';
import { AppDataSource } from './config/database.config';
import { envConfig } from './config/env.config';

const startServer = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    console.log('Database connected successfully');

    // App import after DB init so entities are loaded
    const { app } = await import('./app');

    app.listen(envConfig.port, () => {
      console.log(`Server running on port ${envConfig.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
