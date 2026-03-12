import { Router } from 'express';
import { companyController } from '../controllers/company.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/role-guard.middleware';
import { validateDto } from '../middlewares/validation.middleware';
import { UserRole } from '../constants/roles.constant';
import { CreateCompanyDto, UpdateCompanyDto } from '../dtos/company.dto';

const router = Router();

// All company routes require admin
router.use(authenticateToken, authorizeRoles(UserRole.ADMIN));

/**
 * @swagger
 * /api/companies:
 *   get:
 *     tags: [Companies]
 *     summary: Get all companies (Admin only)
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Companies list
 */
router.get('/', (req, res, next) => companyController.getAll(req, res, next));

/**
 * @swagger
 * /api/companies/{id}:
 *   get:
 *     tags: [Companies]
 *     summary: Get company by ID (Admin only)
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
 *         description: Company data
 */
router.get('/:id', (req, res, next) => companyController.getById(req, res, next));

/**
 * @swagger
 * /api/companies:
 *   post:
 *     tags: [Companies]
 *     summary: Create company (Admin only)
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCompanyDto'
 *     responses:
 *       201:
 *         description: Company created
 */
router.post('/', validateDto(CreateCompanyDto), (req, res, next) => companyController.create(req, res, next));

/**
 * @swagger
 * /api/companies/{id}:
 *   put:
 *     tags: [Companies]
 *     summary: Update company (Admin only)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCompanyDto'
 *     responses:
 *       200:
 *         description: Company updated
 */
router.put('/:id', validateDto(UpdateCompanyDto), (req, res, next) => companyController.update(req, res, next));

/**
 * @swagger
 * /api/companies/{id}:
 *   delete:
 *     tags: [Companies]
 *     summary: Delete company (Admin only)
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
 *         description: Company deleted
 */
router.delete('/:id', (req, res, next) => companyController.delete(req, res, next));

export default router;
