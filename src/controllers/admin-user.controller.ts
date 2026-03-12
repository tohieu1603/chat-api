import { Request, Response, NextFunction } from 'express';
import { adminUserService } from '../services/admin-user.service';
import { responseUtil } from '../utils/response.util';
import { CreateUserDto, UpdateUserDto } from '../dtos/user.dto';

export class AdminUserController {
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query['page'] as string, 10) || 1;
      const limit = parseInt(req.query['limit'] as string, 10) || 10;
      const result = await adminUserService.getAllUsers(page, limit, req.user!);
      responseUtil.paginated(res, result.data, {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await adminUserService.getUserById(req.params['id'] as string, req.user!);
      responseUtil.success(res, user);
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = req.body as CreateUserDto;
      const user = await adminUserService.createUser(dto, req.user!);
      responseUtil.created(res, user);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = req.body as UpdateUserDto;
      const user = await adminUserService.updateUser(req.params['id'] as string, dto, req.user!);
      responseUtil.success(res, user);
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await adminUserService.deleteUser(req.params['id'] as string, req.user!);
      responseUtil.success(res, null, 'User deleted successfully');
    } catch (err) {
      next(err);
    }
  }
}

export const adminUserController = new AdminUserController();
