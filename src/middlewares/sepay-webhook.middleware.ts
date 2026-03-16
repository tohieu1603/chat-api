import { Request, Response, NextFunction } from 'express';
import { envConfig } from '../config/env.config';

/**
 * Verify SePay webhook API key from Authorization header.
 * Always returns 200 per SePay requirement — rejected requests are logged but not retried.
 */
export function sepayWebhookAuth(req: Request, res: Response, next: NextFunction): void {
  const key = envConfig.sepay.webhookApiKey;

  // Skip verification if no key configured (dev mode)
  if (!key) {
    next();
    return;
  }

  const authHeader = req.headers.authorization || '';
  // SePay sends: "Apikey <key>" or just the raw key
  const providedKey = authHeader.startsWith('Apikey ')
    ? authHeader.slice(7)
    : authHeader;

  if (providedKey !== key) {
    console.warn(`[sepay-webhook] Rejected: invalid API key from ${req.ip}`);
    // Always return 200 to prevent SePay retries
    res.status(200).json({ success: true });
    return;
  }

  next();
}
