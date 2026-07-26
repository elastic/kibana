/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line import/no-nodejs-modules
import http from 'http';
import getPort from 'get-port';

/**
 * Minimal MCP JSON-RPC-over-HTTP server simulator, adapted from
 * x-pack/platform/plugins/shared/agent_builder/test/scout_agent_builder_shared/lib/mcp_server_simulator.ts
 * (copied rather than imported -- that file lives inside a plugin's test
 * directory, not an importable @kbn/* package, so it isn't reachable from
 * this suite's package boundary).
 *
 * Used to back a real (non-placeholder) `.pagerduty_mcp` connector for the
 * on-call-lookup workflow-execution example: the connector's `serverUrl`
 * config is pointed at this in-process server instead of
 * https://mcp.pagerduty.com/mcp, so `pagerduty.listOncalls` workflow steps
 * get a deterministic, real MCP round-trip with no live PagerDuty dependency.
 */
interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (
    args: Record<string, unknown>
  ) => Promise<{ content: Array<{ type: string; text: string }> }>;
}

interface McpServerSimulatorOptions {
  tools?: McpTool[];
  serverName?: string;
  serverVersion?: string;
}

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: { code: number; message: string };
}

export class McpServerSimulator {
  private server: http.Server | null = null;
  private port: number | null = null;
  private tools: Map<string, McpTool> = new Map();
  private serverName: string;
  private serverVersion: string;

  constructor(options: McpServerSimulatorOptions = {}) {
    this.serverName = options.serverName ?? 'mcp-test-server';
    this.serverVersion = options.serverVersion ?? '1.0.0';

    if (options.tools) {
      for (const tool of options.tools) {
        this.tools.set(tool.name, tool);
      }
    }
  }

  registerTool(tool: McpTool): void {
    this.tools.set(tool.name, tool);
  }

  async start(): Promise<string> {
    this.port = await getPort({ port: getPort.makeRange(9300, 9399) });

    return new Promise((resolve, reject) => {
      this.server = http.createServer(async (req, res) => {
        await this.handleRequest(req, res);
      });

      const port = this.port;
      if (port === null) {
        reject(new Error('Port allocation failed'));
        return;
      }
      this.server.listen(port, () => {
        resolve(this.getUrl());
      });

      this.server.on('error', reject);
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.server = null;
          this.port = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  getUrl(): string {
    if (!this.port) {
      throw new Error('Server not started');
    }
    return `http://localhost:${this.port}`;
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    if (req.method !== 'POST') {
      this.sendJsonRpcError(res, null, -32600, 'Method not allowed', 405);
      return;
    }

    const contentType = req.headers['content-type'];
    if (!contentType?.includes('application/json')) {
      this.sendJsonRpcError(res, null, -32600, 'Content-Type must be application/json', 415);
      return;
    }

    try {
      const body = await this.readBody(req);
      const message: JsonRpcRequest | JsonRpcRequest[] = JSON.parse(body);

      if (Array.isArray(message)) {
        const responses = await Promise.all(message.map((m) => this.handleJsonRpcMessage(m)));
        const filteredResponses = responses.filter((r) => r !== null);
        if (filteredResponses.length > 0) {
          this.sendResponse(res, 200, filteredResponses);
        } else {
          res.writeHead(202);
          res.end();
        }
        return;
      }

      const response = await this.handleJsonRpcMessage(message);
      if (response === null) {
        res.writeHead(202);
        res.end();
      } else {
        this.sendResponse(res, 200, response);
      }
    } catch {
      this.sendJsonRpcError(res, null, -32700, 'Parse error', 400);
    }
  }

  private async handleJsonRpcMessage(message: JsonRpcRequest): Promise<JsonRpcResponse | null> {
    const { method, params, id } = message;

    if (id === undefined) {
      return null;
    }

    switch (method) {
      case 'initialize':
        return this.handleInitialize(id, params);
      case 'tools/list':
        return this.handleToolsList(id);
      case 'tools/call':
        return this.handleToolsCall(id, params);
      case 'ping':
        return this.createResponse(id, {});
      default:
        return this.createErrorResponse(id, -32601, `Method not found: ${method}`);
    }
  }

  private handleInitialize(
    id: string | number,
    params: Record<string, unknown> | undefined
  ): JsonRpcResponse {
    const clientVersion =
      typeof params?.protocolVersion === 'string' ? params.protocolVersion : '2025-03-26';

    return this.createResponse(id, {
      protocolVersion: clientVersion,
      serverInfo: {
        name: this.serverName,
        version: this.serverVersion,
      },
      capabilities: {
        tools: {},
      },
    });
  }

  private handleToolsList(id: string | number): JsonRpcResponse {
    const tools = Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));

    return this.createResponse(id, { tools });
  }

  private async handleToolsCall(
    id: string | number,
    params: Record<string, unknown> | undefined
  ): Promise<JsonRpcResponse> {
    const name = params?.name as string;
    const args = params?.arguments as Record<string, unknown> | undefined;
    const tool = this.tools.get(name);

    if (!tool) {
      return this.createErrorResponse(id, -32602, `Tool not found: ${name}`);
    }

    try {
      const result = await tool.handler(args ?? {});
      return this.createResponse(id, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.createErrorResponse(id, -32000, `Tool execution failed: ${message}`);
    }
  }

  private createResponse(id: string | number, result: unknown): JsonRpcResponse {
    return { jsonrpc: '2.0', id, result };
  }

  private createErrorResponse(id: string | number, code: number, message: string): JsonRpcResponse {
    return { jsonrpc: '2.0', id, error: { code, message } };
  }

  private sendResponse(
    res: http.ServerResponse,
    statusCode: number,
    body: JsonRpcResponse | JsonRpcResponse[]
  ): void {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
      'mcp-session-id': 'test-session',
    });
    res.end(JSON.stringify(body));
  }

  private sendJsonRpcError(
    res: http.ServerResponse,
    id: string | number | null,
    code: number,
    message: string,
    statusCode: number
  ): void {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }));
  }

  private readBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => resolve(body));
      req.on('error', reject);
    });
  }
}

/**
 * Fixed on-call schedule for the Chrysalis incident-response scenario.
 * Matches the shape PagerDuty's real `list_oncalls` MCP tool returns
 * (an array of oncall entries with user/schedule/escalation_policy refs).
 */
const CHRYSALIS_ONCALL_SCHEDULE = [
  {
    user: { id: 'PCHRYS01', summary: 'Alex Rivera', type: 'user_reference' },
    schedule: { id: 'SCHRYS01', summary: 'Security IR Primary' },
    escalation_policy: { id: 'ECHRYS01', summary: 'Security Incident Response' },
    escalation_level: 1,
    start: '2026-07-26T00:00:00Z',
    end: '2026-07-27T00:00:00Z',
  },
];

/**
 * Creates an MCP server simulator pre-registered with a `list_oncalls` tool
 * returning a fixed on-call schedule, matching PagerDuty's real MCP tool
 * name and response shape (see pagerduty.ts's `listOncalls` action, which
 * calls `callToolJson(ctx, 'list_oncalls', ...)`).
 */
export function createPagerdutyMockMcpServer(): McpServerSimulator {
  const simulator = new McpServerSimulator({
    serverName: 'pagerduty-mock-mcp-server',
    serverVersion: '1.0.0',
  });

  simulator.registerTool({
    name: 'list_oncalls',
    description: 'Get current on-call assignments',
    inputSchema: {
      type: 'object',
      properties: {
        query_model: { type: 'object' },
      },
    },
    handler: async () => ({
      content: [{ type: 'text', text: JSON.stringify(CHRYSALIS_ONCALL_SCHEDULE) }],
    }),
  });

  return simulator;
}
