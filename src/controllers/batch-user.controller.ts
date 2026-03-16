import { Request, Response, NextFunction } from 'express';
import { adminUserService } from '../services/admin-user.service';
import { responseUtil } from '../utils/response.util';

class BatchUserController {
  async batchCreate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { users } = req.body;

      if (!Array.isArray(users) || users.length === 0) {
        responseUtil.error(res, 'Danh sách nhân viên không được trống', 400);
        return;
      }
      if (users.length > 100) {
        responseUtil.error(res, 'Tối đa 100 nhân viên mỗi lần tạo', 400);
        return;
      }

      const result = await adminUserService.batchCreateUsers(users, req.user!);
      responseUtil.success(res, result, `Đã tạo ${result.created.length} tài khoản`, 201);
    } catch (err) {
      next(err);
    }
  }
}

export const batchUserController = new BatchUserController();
