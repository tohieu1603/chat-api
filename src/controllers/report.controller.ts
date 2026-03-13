import { Request, Response, NextFunction } from 'express';
import { reportService } from '../services/report.service';
import { responseUtil } from '../utils/response.util';

class ReportController {
  async getAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reports = await reportService.getAll();
      responseUtil.success(res, reports, 'Lấy danh sách báo cáo thành công');
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const report = await reportService.create(req.body);
      responseUtil.created(res, report, 'Tạo báo cáo thành công');
    } catch (error) {
      next(error);
    }
  }
}

export const reportController = new ReportController();
