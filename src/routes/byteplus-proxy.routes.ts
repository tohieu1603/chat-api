/**
 * BytePlus Proxy Routes
 * Proxy OpenAI-compatible requests → BytePlus Ark API dùng server-side API key.
 * Client gửi request format OpenAI → server inject key → forward → stream về.
 */

import { Router, Request, Response } from 'express';
import { apiKeyService } from '../services/api-key.service';
import { userRepository } from '../repositories/user.repository';
import { envConfig } from '../config/env.config';

const router = Router();

const API_KEY_HEADER = 'x-api-key';
const PROXY_TIMEOUT_MS = 300_000; // 5 phút

const MODEL_MAP: Record<string, string> = {
  'operis-multi': 'kimi-k2.5',
};

/**
 * POST /api/byteplus/chat/completions
 * Proxy chat completions tới BytePlus. Yêu cầu xác thực bằng API key (x-api-key).
 */
router.post('/chat/completions', async (req: Request, res: Response) => {
  // Auth: chỉ chấp nhận API key
  const apiKey = req.headers[API_KEY_HEADER] as string | undefined;
  if (!apiKey) {
    res.status(401).json({ success: false, message: 'Thiếu API key. Vui lòng cung cấp x-api-key trong header.' });
    return;
  }

  const keyResult = await apiKeyService.validateKey(apiKey);
  if (!keyResult) {
    res.status(401).json({ success: false, message: 'API key không hợp lệ hoặc đã bị vô hiệu hoá.' });
    return;
  }

  const user = await userRepository.findById(keyResult.userId);
  if (!user || !user.isActive) {
    res.status(403).json({ success: false, message: 'Tài khoản đã bị vô hiệu hoá.' });
    return;
  }

  const isStreaming = req.body?.stream === true;
  const model = req.body?.model || 'unknown';

  // Kiểm tra BytePlus API key
  const byteplusKey = envConfig.byteplus.apiKey;
  if (!byteplusKey) {
    res.status(500).json({
      success: false,
      message: 'Hệ thống chưa cấu hình dịch vụ AI. Vui lòng liên hệ quản trị viên.',
    });
    return;
  }

  // Chuẩn bị body — map model aliases + đảm bảo stream_options
  const body = { ...req.body };
  if (body.model && MODEL_MAP[body.model]) {
    body.model = MODEL_MAP[body.model];
  }
  if (isStreaming) {
    body.stream_options = { ...body.stream_options, include_usage: true };
  }

  // Xóa fields không hỗ trợ
  delete body.store;
  delete body.metadata;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

  try {
    const byteplusRes = await fetch(`${envConfig.byteplus.apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${byteplusKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!byteplusRes.ok) {
      const errorBody = await byteplusRes.text();
      console.error('[byteplus-proxy] Lỗi BytePlus:', byteplusRes.status, errorBody);

      const safeStatus = byteplusRes.status === 429 ? 429 : byteplusRes.status >= 500 ? 502 : 400;
      const safeMessages: Record<number, string> = {
        429: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
        502: 'Dịch vụ AI tạm thời không khả dụng.',
        400: 'Yêu cầu không hợp lệ. Vui lòng kiểm tra lại.',
      };
      res.status(safeStatus).json({
        success: false,
        message: safeMessages[safeStatus],
      });
      return;
    }

    if (isStreaming) {
      // Stream SSE về client
      res.setHeader('content-type', 'text/event-stream');
      res.setHeader('cache-control', 'no-cache, no-transform');
      res.setHeader('connection', 'keep-alive');
      res.setHeader('x-accel-buffering', 'no');

      const reader = byteplusRes.body?.getReader();
      if (!reader) { res.end(); return; }

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      } catch (err) {
        console.error('[byteplus-proxy] Lỗi stream:', err);
      }

      res.end();
    } else {
      // Non-stream: forward response
      const responseText = await byteplusRes.text();
      res.setHeader('content-type', 'application/json');
      res.send(responseText);
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      res.status(504).json({
        success: false,
        message: 'Yêu cầu đã hết thời gian chờ. Vui lòng thử lại.',
      });
    } else {
      console.error('[byteplus-proxy] Lỗi:', err);
      res.status(502).json({
        success: false,
        message: 'Dịch vụ tạm thời không khả dụng.',
      });
    }
  }
});

export default router;
