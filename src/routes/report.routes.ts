import { Router } from 'express';
import { reportController } from '../controllers/report.controller';
import { validateDto } from '../middlewares/validation.middleware';
import { CreateReportDto } from '../dtos/report.dto';

const router = Router();

/**
 * @swagger
 * /api/reports:
 *   get:
 *     tags: [Reports]
 *     summary: Lấy danh sách báo cáo
 *     responses:
 *       200:
 *         description: Danh sách báo cáo
 */
router.get('/', (req, res, next) => reportController.getAll(req, res, next));

/**
 * @swagger
 * /api/reports:
 *   post:
 *     tags: [Reports]
 *     summary: Tạo báo cáo mới
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - message
 *             properties:
 *               username:
 *                 type: string
 *               message:
 *                 type: string
 *               time:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Tạo báo cáo thành công
 */
router.post('/', validateDto(CreateReportDto), (req, res, next) => reportController.create(req, res, next));

export default router;
