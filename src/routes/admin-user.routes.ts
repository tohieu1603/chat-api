import { Router } from 'express';
import { adminUserController } from '../controllers/admin-user.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/role-guard.middleware';
import { validateDto } from '../middlewares/validation.middleware';
import { CreateUserDto, UpdateUserDto } from '../dtos/user.dto';
import { UserRole } from '../constants/roles.constant';

const router = Router();

// Admin + Director + Manager can manage users (scoped by role in service layer)
const guard = [authenticateToken, authorizeRoles(UserRole.ADMIN, UserRole.DIRECTOR, UserRole.MANAGER)];

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     tags: [Admin - Users]
 *     summary: List all users
 *     description: Returns paginated list of users. Admin only.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Paginated user list
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         users:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/User'
 *                         total:
 *                           type: integer
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions
 */
router.get('/', ...guard, (req, res, next) => adminUserController.getAll(req, res, next));

/**
 * @swagger
 * /api/admin/users/{id}:
 *   get:
 *     tags: [Admin - Users]
 *     summary: Get user by ID
 *     description: Returns a single user by UUID. Admin only.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User UUID
 *     responses:
 *       200:
 *         description: User data
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: User not found
 */
router.get('/:id', ...guard, (req, res, next) => adminUserController.getById(req, res, next));

/**
 * @swagger
 * /api/admin/users:
 *   post:
 *     tags: [Admin - Users]
 *     summary: Create user
 *     description: Creates a new user with specified role. Admin only.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserDto'
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error or email already exists
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions
 */
router.post('/', ...guard, validateDto(CreateUserDto), (req, res, next) => adminUserController.create(req, res, next));

/**
 * @swagger
 * /api/admin/users/{id}:
 *   put:
 *     tags: [Admin - Users]
 *     summary: Update user
 *     description: Updates user fields by UUID. Admin only.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserDto'
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: User not found
 */
router.put('/:id', ...guard, validateDto(UpdateUserDto), (req, res, next) => adminUserController.update(req, res, next));

/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     tags: [Admin - Users]
 *     summary: Delete user
 *     description: Deletes user by UUID. Admin only.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User UUID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: User not found
 */
router.delete('/:id', ...guard, (req, res, next) => adminUserController.delete(req, res, next));

export default router;
