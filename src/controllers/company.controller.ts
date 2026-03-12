import { Request, Response, NextFunction } from 'express';
import { companyService } from '../services/company.service';
import { responseUtil } from '../utils/response.util';

class CompanyController {
  async getAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companies = await companyService.getAll();
      responseUtil.success(res, companies, 'Lấy danh sách công ty thành công');
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const company = await companyService.getById(req.params['id'] as string);
      responseUtil.success(res, company, 'Lấy thông tin công ty thành công');
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const company = await companyService.create(req.body);
      responseUtil.created(res, company, 'Tạo công ty thành công');
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const company = await companyService.update(req.params['id'] as string, req.body);
      responseUtil.success(res, company, 'Cập nhật công ty thành công');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await companyService.delete(req.params['id'] as string);
      responseUtil.success(res, null, 'Xoá công ty thành công');
    } catch (error) {
      next(error);
    }
  }
}

export const companyController = new CompanyController();
