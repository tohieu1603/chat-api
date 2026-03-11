import { Router } from 'express';
import { apiKeyController } from '../controllers/api-key.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validateDto } from '../middlewares/validation.middleware';
import { CreateApiKeyDto, RevokeApiKeyDto } from '../dtos/api-key.dto';

const router = Router();

// All routes require cookie-based authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/api-keys:
 *   post:
 *     tags: [API Keys]
 *     summary: Create a new API key
 *     description: Generates a new API key for the authenticated user. The raw key is only shown once.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateApiKeyDto'
 *     responses:
 *       201:
 *         description: API key created. Raw key included in response (shown only once).
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - properties:
 *                     data:
 *                       $ref: '#/components/schemas/ApiKeyCreated'
 *       401:
 *         description: Not authenticated
 */
router.post('/', validateDto(CreateApiKeyDto), (req, res, next) => apiKeyController.create(req, res, next));

/**
 * @swagger
 * /api/api-keys:
 *   get:
 *     tags: [API Keys]
 *     summary: List all API keys
 *     description: Returns all API keys for the authenticated user (without raw key values).
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of API keys
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ApiKeyResponse'
 *       401:
 *         description: Not authenticated
 */
router.get('/', (req, res, next) => apiKeyController.list(req, res, next));

/**
 * @swagger
 * /api/api-keys/{id}/revoke:
 *   post:
 *     tags: [API Keys]
 *     summary: Revoke an API key
 *     description: Deactivates an API key. The key can no longer be used but the record is kept.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RevokeApiKeyDto'
 *     responses:
 *       200:
 *         description: API key revoked
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: API key not found
 */
router.post('/:id/revoke', validateDto(RevokeApiKeyDto), (req, res, next) => apiKeyController.revoke(req, res, next));

/**
 * @swagger
 * /api/api-keys/{id}:
 *   delete:
 *     tags: [API Keys]
 *     summary: Delete an API key
 *     description: Permanently deletes an API key (soft delete).
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: API key deleted
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: API key not found
 */
router.delete('/:id', (req, res, next) => apiKeyController.delete(req, res, next));

export default router;
