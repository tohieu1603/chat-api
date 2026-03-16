import { Router, Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { authenticateToken } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/role-guard.middleware';
import { UserRole } from '../constants/roles.constant';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { registerCreateUserTool } from './tools/user-account.tool';
import { registerBatchCreateUsersTool } from './tools/batch-user-account.tool';
import { registerListRolesTool } from './tools/role-list.tool';

const router = Router();

// Auth: Director + Manager can use MCP tools (admin has separate API at /api/admin/users)
const guard = [authenticateToken, authorizeRoles(UserRole.DIRECTOR, UserRole.MANAGER)];

/**
 * Stateless MCP endpoint.
 * Each request gets a fresh McpServer + StreamableHTTPServerTransport.
 */
router.post('/', ...guard, async (req: Request, res: Response) => {
  try {
    const caller = req.user as JwtPayload;

    const server = new McpServer({
      name: 'auth-chat-operis',
      version: '1.0.0',
    });

    // Register tools with caller context
    registerCreateUserTool(server, () => caller);
    registerBatchCreateUsersTool(server, () => caller);
    registerListRolesTool(server, () => caller);

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on('close', () => {
      transport.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('MCP request error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
});

export default router;
