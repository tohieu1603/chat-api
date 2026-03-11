import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/app-error.util';

export function validateDto(DtoClass: new () => object) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const dtoInstance = plainToInstance(DtoClass, req.body);
    const errors = await validate(dtoInstance as object, { whitelist: true, forbidNonWhitelisted: true });

    if (errors.length > 0) {
      const messages = errors.flatMap(err => Object.values(err.constraints || {}));
      return next(new AppError(messages.join(', '), 400));
    }

    req.body = dtoInstance;
    next();
  };
}
