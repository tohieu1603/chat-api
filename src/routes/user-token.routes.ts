import { Router, Request, Response, NextFunction } from 'express';
import { userTokenRepository } from '../repositories/user-token.repository';
import { userRepository } from '../repositories/user.repository';
import { responseUtil } from '../utils/response.util';

const router = Router();

/**
 * @swagger
 * /api/user-tokens:
 *   post:
 *     tags: [UserTokens]
 *     summary: Ghi nhận token cho user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, token]
 *             properties:
 *               userId:
 *                 type: string
 *               token:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Ghi nhận thành công
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, token } = req.body;
    if (!userId || token == null) {
      res.status(400).json({ success: false, message: 'Thiếu userId hoặc token' });
      return;
    }
    const record = await userTokenRepository.create({ userId, token });
    responseUtil.created(res, record, 'Ghi nhận token thành công');
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/user-tokens:
 *   get:
 *     tags: [UserTokens]
 *     summary: Lấy toàn bộ log token
 *     responses:
 *       200:
 *         description: Danh sách
 */
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const records = await userTokenRepository.findAll();
    responseUtil.success(res, records);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/user-tokens/log/{userId}:
 *   get:
 *     tags: [UserTokens]
 *     summary: Xem log cộng/trừ token theo userId
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lịch sử token
 */
router.get('/log/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const records = await userTokenRepository.findByUserId(userId);
    responseUtil.success(res, records);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/user-tokens/add:
 *   post:
 *     tags: [UserTokens]
 *     summary: Cộng token cho user (bên thứ 3 gọi)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, amount]
 *             properties:
 *               userId:
 *                 type: string
 *               amount:
 *                 type: integer
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cộng token thành công
 */
router.post('/add', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, amount, description } = req.body;
    if (!userId || !amount || amount <= 0) {
      res.status(400).json({ success: false, message: 'Thiếu userId hoặc amount phải > 0' });
      return;
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'Không tìm thấy user' });
      return;
    }

    const currentBalance = Number(user.tokenBalance) || 0;
    user.tokenBalance = currentBalance + amount;
    await userRepository.save(user);

    // Ghi log
    await userTokenRepository.create({
      userId,
      token: amount,
      type: 'add',
      balanceAfter: user.tokenBalance,
      description: description || null,
    });

    responseUtil.success(res, {
      userId: user.id,
      added: amount,
      balanceAfter: user.tokenBalance,
    }, 'Cộng token thành công');
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/user-tokens/deduct:
 *   post:
 *     tags: [UserTokens]
 *     summary: Trừ token của user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, amount]
 *             properties:
 *               userId:
 *                 type: string
 *               amount:
 *                 type: integer
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Trừ token thành công
 */
router.post('/deduct', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, amount, description } = req.body;
    if (!userId || !amount || amount <= 0) {
      res.status(400).json({ success: false, message: 'Thiếu userId hoặc amount phải > 0' });
      return;
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'Không tìm thấy user' });
      return;
    }

    const currentBalance = Number(user.tokenBalance) || 0;
    if (currentBalance < amount) {
      res.status(400).json({
        success: false,
        message: `Không đủ token. Hiện có: ${currentBalance}, cần trừ: ${amount}`,
      });
      return;
    }

    user.tokenBalance = currentBalance - amount;
    await userRepository.save(user);

    // Ghi log
    await userTokenRepository.create({
      userId,
      token: amount,
      type: 'deduct',
      balanceAfter: user.tokenBalance,
      description: description || null,
    });

    responseUtil.success(res, {
      userId: user.id,
      deducted: amount,
      balanceAfter: user.tokenBalance,
    }, 'Trừ token thành công');
  } catch (error) {
    next(error);
  }
});

export default router;
