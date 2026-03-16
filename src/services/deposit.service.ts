import { AppDataSource } from '../config/database.config';
import { envConfig } from '../config/env.config';
import { depositOrderRepository } from '../repositories/deposit-order.repository';
import { tokenTransactionRepository } from '../repositories/token-transaction.repository';
import { userRepository } from '../repositories/user.repository';
import { DepositOrder } from '../entities/deposit-order.entity';
import { User } from '../entities/user.entity';
import { TokenTransaction } from '../entities/token-transaction.entity';
import { AppError } from '../utils/app-error.util';

// Pricing: 1M tokens = 200,000 VND
const TOKEN_PRICE_VND = 200000;
const TOKENS_PER_UNIT = 1000000;
const DEPOSIT_EXPIRY_MINUTES = 30;

/** Generate unique order code: OP (token) / OD (order) */
function generateOrderCode(prefix: 'OP' | 'OD'): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${ts}${rand}`;
}

function calculateVndFromTokens(tokens: number): number {
  return Math.ceil((tokens / TOKENS_PER_UNIT) * TOKEN_PRICE_VND);
}

class DepositService {
  /**
   * Tạo đơn nạp token
   */
  async createDeposit(userId: string, tokenAmount: number) {
    const user = await userRepository.findById(userId);
    if (!user) throw AppError.notFound('Không tìm thấy user');
    if (!user.isActive) throw AppError.forbidden('Tài khoản đã bị vô hiệu hoá');

    if (tokenAmount < 100000) {
      throw AppError.badRequest('Tối thiểu 100.000 token');
    }

    const amountVnd = calculateVndFromTokens(tokenAmount);

    // Check existing pending order — reuse if same amount
    const pending = await depositOrderRepository.findPendingByUser(userId, 'token');
    if (pending && pending.amountVnd === amountVnd) {
      return this.formatResponse(pending);
    }
    // Cancel old pending if different amount
    if (pending) {
      await depositOrderRepository.updateStatus(pending.id, { status: 'cancelled' });
    }

    await depositOrderRepository.markExpired();

    const orderCode = generateOrderCode('OP');
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + DEPOSIT_EXPIRY_MINUTES);

    const order = await depositOrderRepository.create({
      userId,
      orderCode,
      type: 'token',
      tokenAmount,
      amountVnd,
      expiresAt,
    });

    return this.formatResponse(order);
  }

  /**
   * Lấy đơn pending hiện tại
   */
  async getPendingOrder(userId: string) {
    const order = await depositOrderRepository.findPendingByUser(userId);
    if (!order) return { hasPending: false, order: null };
    return { hasPending: true, order: this.formatResponse(order) };
  }

  /**
   * Hủy đơn pending
   */
  async cancelOrder(userId: string, orderId: string) {
    const order = await depositOrderRepository.findByIdAndUser(orderId, userId);
    if (!order) throw AppError.notFound('Không tìm thấy đơn');
    if (order.status !== 'pending') throw AppError.badRequest('Chỉ hủy được đơn đang chờ');

    await depositOrderRepository.updateStatus(orderId, { status: 'cancelled' });
    return { success: true };
  }

  /**
   * Lịch sử nạp tiền
   */
  async getHistory(userId: string, limit = 20, offset = 0) {
    const [orders, total] = await depositOrderRepository.findUserHistory(userId, limit, offset);
    return { orders: orders.map((o) => this.formatResponse(o)), total };
  }

  /**
   * Lịch sử token transactions
   */
  async getTokenHistory(userId: string, limit = 50, offset = 0) {
    const [transactions, total] = await tokenTransactionRepository.findByUser(userId, limit, offset);
    return { transactions, total };
  }

  /**
   * Xử lý webhook từ SePay — luôn trả 200
   * Idempotent: duplicate referenceCode = no-op
   * Atomic: update order + credit tokens in single transaction
   */
  async processWebhook(data: {
    transferType: string;
    transferAmount: number;
    content: string;
    referenceCode: string;
    transactionDate: string;
  }): Promise<{ success: boolean }> {
    // Extract order code from content
    const match = data.content.match(/(OP|OD)[A-Z0-9]+/);
    if (!match) {
      console.warn('[deposit] Webhook: no order code in content:', data.content);
      return { success: false };
    }

    const orderCode = match[0];

    // Idempotency check
    if (data.referenceCode) {
      const existing = await depositOrderRepository.findByPaymentReference(data.referenceCode);
      if (existing) return { success: true };
    }

    const order = await depositOrderRepository.findByCode(orderCode);
    if (!order) {
      console.warn(`[deposit] Webhook: order not found: ${orderCode}`);
      return { success: false };
    }

    if (order.status === 'completed') return { success: true };
    if (order.status !== 'pending' && order.status !== 'expired') {
      return { success: false };
    }

    // Verify amount
    if (data.transferAmount < order.amountVnd) {
      console.warn(`[deposit] Amount mismatch: expected ${order.amountVnd}, got ${data.transferAmount}`);
      return { success: false };
    }

    // Atomic: update order + credit tokens
    await AppDataSource.transaction(async (manager) => {
      // Update order status
      await manager.update(DepositOrder, { id: order.id }, {
        status: 'completed' as const,
        paymentMethod: 'bank_transfer',
        paymentReference: data.referenceCode,
        paidAt: new Date(data.transactionDate),
      });

      // Credit tokens to user
      const user = await manager.findOne(User, { where: { id: order.userId } });
      const newBalance = Number(user?.tokenBalance || 0) + Number(order.tokenAmount);

      await manager.update(User, { id: order.userId }, { tokenBalance: newBalance });

      // Log transaction
      const tx = manager.create(TokenTransaction, {
        userId: order.userId,
        type: 'credit',
        amount: order.tokenAmount,
        balanceAfter: newBalance,
        description: `Nạp token: ${orderCode}`,
        referenceId: order.id,
      });
      await manager.save(tx);
    });

    console.log(`[deposit] Order ${order.id} completed — ${order.tokenAmount} tokens credited to user ${order.userId}`);
    return { success: true };
  }

  /**
   * Admin: cộng/trừ token thủ công
   */
  async adminUpdateTokens(adminUserId: string, targetUserId: string, amount: number, reason: string) {
    const user = await userRepository.findById(targetUserId);
    if (!user) throw AppError.notFound('Không tìm thấy user');

    const currentBalance = Number(user.tokenBalance || 0);
    const newBalance = currentBalance + amount;

    if (newBalance < 0) throw AppError.badRequest('Số dư không đủ');

    await AppDataSource.transaction(async (manager) => {
      await manager.update(User, { id: targetUserId }, { tokenBalance: newBalance });

      const tx = manager.create(TokenTransaction, {
        userId: targetUserId,
        type: amount > 0 ? 'credit' : 'debit' as const,
        amount: Math.abs(amount),
        balanceAfter: newBalance,
        description: `Admin: ${reason}`,
        referenceId: `admin:${adminUserId}`,
      });
      await manager.save(tx);
    });

    return { userId: targetUserId, newBalance };
  }

  /** Format deposit order for API response */
  private formatResponse(order: any) {
    const now = new Date();
    const expiresAt = new Date(order.expiresAt);
    const status = order.status === 'pending' && expiresAt <= now ? 'expired' : order.status;

    return {
      id: order.id,
      type: order.type,
      orderCode: order.orderCode,
      tokenAmount: Number(order.tokenAmount),
      amountVnd: order.amountVnd,
      status,
      paymentInfo: {
        bankName: envConfig.sepay.bankCode,
        accountNumber: envConfig.sepay.bankAccount,
        accountName: envConfig.sepay.accountName,
        transferContent: order.orderCode,
        qrCodeUrl: this.generateQrUrl(order),
      },
      expiresAt: expiresAt.toISOString(),
      createdAt: order.createdAt,
    };
  }

  /** Generate SePay QR code URL */
  private generateQrUrl(order: any): string {
    const params = new URLSearchParams({
      acc: envConfig.sepay.bankAccount,
      bank: envConfig.sepay.bankCode,
      amount: String(order.amountVnd),
      des: order.orderCode,
    });
    return `https://qr.sepay.vn/img?${params.toString()}`;
  }
}

export const depositService = new DepositService();
