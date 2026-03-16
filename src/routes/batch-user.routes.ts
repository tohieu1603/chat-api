import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/role-guard.middleware';
import { UserRole } from '../constants/roles.constant';
import { batchUserController } from '../controllers/batch-user.controller';

const router = Router();
const guard = [authenticateToken, authorizeRoles(UserRole.ADMIN, UserRole.DIRECTOR, UserRole.MANAGER)];

/**
 * @swagger
 * /api/admin/users/batch:
 *   post:
 *     tags: [Admin Users]
 *     summary: Tạo nhiều tài khoản người dùng cùng lúc
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [users]
 *             properties:
 *               users:
 *                 type: array
 *                 maxItems: 100
 *                 items:
 *                   type: object
 *                   required: [fullName, role]
 *                   properties:
 *                     fullName:
 *                       type: string
 *                       minLength: 2
 *                     email:
 *                       type: string
 *                       format: email
 *                     role:
 *                       type: string
 *                       enum: [manager, employee]
 *                     position:
 *                       type: string
 *     responses:
 *       201:
 *         description: Kết quả tạo tài khoản hàng loạt
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền
 */
router.post('/batch', ...guard, batchUserController.batchCreate.bind(batchUserController));

export default router;
