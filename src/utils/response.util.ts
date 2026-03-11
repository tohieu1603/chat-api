import { Response } from 'express';
import { ApiResponse, PaginatedResponse } from '../interfaces';

export const responseUtil = {
  success<T>(res: Response, data: T, message = 'Success', statusCode = 200): void {
    const response: ApiResponse<T> = { success: true, message, data };
    res.status(statusCode).json(response);
  },

  created<T>(res: Response, data: T, message = 'Created successfully'): void {
    this.success(res, data, message, 201);
  },

  noContent(res: Response): void {
    res.status(204).send();
  },

  paginated<T>(res: Response, data: T[], meta: PaginatedResponse<T>['meta'], message = 'Success'): void {
    const response: PaginatedResponse<T> = { success: true, message, data, meta };
    res.status(200).json(response);
  },

  error(res: Response, message: string, statusCode = 500, errors?: string[]): void {
    const response: ApiResponse = { success: false, message, errors };
    res.status(statusCode).json(response);
  },
};
