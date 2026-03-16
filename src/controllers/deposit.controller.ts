import { Request, Response, NextFunction } from 'express';
import { depositService } from '../services/deposit.service';
import { responseUtil } from '../utils/response.util';

class DepositController {
  /** POST /deposits — Tạo đơn nạp token */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { tokenAmount } = req.body;
      const order = await depositService.createDeposit(userId, tokenAmount);
      responseUtil.created(res, order, 'Tạo đơn nạp thành công');
    } catch (error) {
      next(error);
    }
  }

  /** GET /deposits/pending — Đơn đang chờ */
  async getPending(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await depositService.getPendingOrder(req.user!.userId);
      responseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /** DELETE /deposits/:id — Hủy đơn pending */
  async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await depositService.cancelOrder(req.user!.userId, req.params['id'] as string);
      responseUtil.success(res, result, 'Hủy đơn thành công');
    } catch (error) {
      next(error);
    }
  }

  /** GET /deposits/history — Lịch sử nạp tiền */
  async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(String(req.query.limit ?? '20'), 10);
      const offset = parseInt(String(req.query.offset ?? '0'), 10);
      const result = await depositService.getHistory(req.user!.userId, limit, offset);
      responseUtil.success(res, result, 'Lấy lịch sử nạp thành công');
    } catch (error) {
      next(error);
    }
  }

  /** GET /deposits/tokens — Lịch sử token */
  async getTokenHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(String(req.query.limit ?? '50'), 10);
      const offset = parseInt(String(req.query.offset ?? '0'), 10);
      const result = await depositService.getTokenHistory(req.user!.userId, limit, offset);
      responseUtil.success(res, result, 'Lấy lịch sử token thành công');
    } catch (error) {
      next(error);
    }
  }

  /** POST /deposits/webhook/sepay — SePay webhook callback (always returns 200) */
  async sepayWebhook(req: Request, res: Response): Promise<void> {
    try {
      await depositService.processWebhook({
        transferType: req.body.transferType,
        transferAmount: req.body.transferAmount,
        content: req.body.content,
        referenceCode: req.body.referenceCode,
        transactionDate: req.body.transactionDate,
      });
    } catch (error) {
      console.error('[sepay-webhook] Processing error:', error);
    }
    // Always return 200 — SePay requirement
    res.status(200).json({ success: true });
  }

  /** POST /deposits/credit — Cộng token cho user (public, không cần auth) */
  async creditTokens(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, token } = req.body;
      if (!userId || !token || token <= 0) {
        res.status(400).json({ success: false, message: 'Thiếu userId hoặc token (phải > 0)' });
        return;
      }
      const result = await depositService.adminUpdateTokens('system', userId, token, 'API credit');
      responseUtil.success(res, result, 'Cộng token thành công');
    } catch (error) {
      next(error);
    }
  }

  /** POST /deposits/admin/tokens — Admin cộng/trừ token */
  async adminUpdateTokens(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, amount, reason } = req.body;
      if (!userId || amount == null || !reason) {
        res.status(400).json({ success: false, message: 'Thiếu userId, amount hoặc reason' });
        return;
      }
      const result = await depositService.adminUpdateTokens(req.user!.userId, userId, amount, reason);
      responseUtil.success(res, result, 'Cập nhật token thành công');
    } catch (error) {
      next(error);
    }
  }
}

export const depositController = new DepositController();
