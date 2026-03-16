import { Router } from 'express';
import { depositController } from '../controllers/deposit.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/role-guard.middleware';
import { sepayWebhookAuth } from '../middlewares/sepay-webhook.middleware';
import { UserRole } from '../constants/roles.constant';

const router = Router();

// ── PUBLIC: SePay webhook ──────────────────────────────────────────────
/**
 * @swagger
 * /api/deposits/webhook/sepay:
 *   post:
 *     tags: [Deposits]
 *     summary: Webhook nhận thông báo từ SePay
 *     security: []
 *     responses:
 *       200:
 *         description: Webhook processed
 */
router.post('/webhook/sepay', sepayWebhookAuth, (req, res) => depositController.sepayWebhook(req, res));

// ── PROTECTED: Yêu cầu JWT auth ───────────────────────────────────────
router.use(authenticateToken);

/**
 * @swagger
 * /api/deposits:
 *   post:
 *     tags: [Deposits]
 *     summary: Tạo đơn nạp token
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tokenAmount]
 *             properties:
 *               tokenAmount:
 *                 type: integer
 *                 minimum: 100000
 *     responses:
 *       201:
 *         description: Đơn nạp đã tạo
 */
router.post('/', (req, res, next) => depositController.create(req, res, next));

/**
 * @swagger
 * /api/deposits/pending:
 *   get:
 *     tags: [Deposits]
 *     summary: Đơn đang chờ thanh toán
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Đơn pending hoặc null
 */
router.get('/pending', (req, res, next) => depositController.getPending(req, res, next));

/**
 * @swagger
 * /api/deposits/history:
 *   get:
 *     tags: [Deposits]
 *     summary: Lịch sử nạp tiền
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Danh sách đơn nạp
 */
router.get('/history', (req, res, next) => depositController.getHistory(req, res, next));

/**
 * @swagger
 * /api/deposits/tokens:
 *   get:
 *     tags: [Deposits]
 *     summary: Lịch sử token transactions
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Lịch sử cộng/trừ token
 */
router.get('/tokens', (req, res, next) => depositController.getTokenHistory(req, res, next));

/**
 * @swagger
 * /api/deposits/{id}:
 *   delete:
 *     tags: [Deposits]
 *     summary: Hủy đơn nạp pending
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Hủy thành công
 */
router.delete('/:id', (req, res, next) => depositController.cancel(req, res, next));

// ── ADMIN: Cộng/trừ token thủ công ────────────────────────────────────
/**
 * @swagger
 * /api/deposits/admin/tokens:
 *   post:
 *     tags: [Deposits]
 *     summary: "[Admin] Cộng/trừ token cho user"
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, amount, reason]
 *             properties:
 *               userId:
 *                 type: string
 *               amount:
 *                 type: integer
 *                 description: Số dương = cộng, âm = trừ
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.post('/admin/tokens', authorizeRoles(UserRole.ADMIN), (req, res, next) => depositController.adminUpdateTokens(req, res, next));

export default router;
