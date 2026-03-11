import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/app-error.util';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Handle TypeORM errors
  if (err.name === 'QueryFailedError') {
    res.status(400).json({
      success: false,
      message: 'Database query failed',
    });
    return;
  }

  // Handle JSON parse errors
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body',
    });
    return;
  }

  // Unknown errors
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};
