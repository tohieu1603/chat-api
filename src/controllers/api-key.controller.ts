import { Request, Response, NextFunction } from 'express';
import { apiKeyService } from '../services/api-key.service';
import { responseUtil } from '../utils/response.util';
import { CreateApiKeyDto, RevokeApiKeyDto } from '../dtos/api-key.dto';

export class ApiKeyController {
  /** Create a new API key for the authenticated user */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = req.body as CreateApiKeyDto;
      const result = await apiKeyService.createKey(req.user!.userId, dto);
      responseUtil.created(res, result, 'API key created. Save the key - it will not be shown again.');
    } catch (err) {
      next(err);
    }
  }

  /** List all API keys for the authenticated user */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const keys = await apiKeyService.listKeys(req.user!.userId);
      responseUtil.success(res, keys);
    } catch (err) {
      next(err);
    }
  }

  /** Revoke an API key (deactivate but keep record) */
  async revoke(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = req.body as RevokeApiKeyDto;
      await apiKeyService.revokeKey(req.params['id'] as string, req.user!.userId, dto.reason);
      responseUtil.success(res, null, 'API key revoked');
    } catch (err) {
      next(err);
    }
  }

  /** Delete an API key permanently */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await apiKeyService.deleteKey(req.params['id'] as string, req.user!.userId);
      responseUtil.success(res, null, 'API key deleted');
    } catch (err) {
      next(err);
    }
  }
}

export const apiKeyController = new ApiKeyController();
