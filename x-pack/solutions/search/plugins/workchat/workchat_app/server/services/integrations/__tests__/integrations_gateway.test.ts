import { IntegrationsGateway } from '../integrations_gateway';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

describe('IntegrationsGateway', () => {
    describe('MCP servers with tools', () => {

        const server = new McpServer({
            name: 'Test Server 1',
            version: '1.0.0',
        });

        server.tool('add', { a: z.number(), b: z.number() }, async ({ a, b }) => ({
            content: [{ type: 'text', text: String(a + b) }],
        }));

        const server2 = new McpServer({
            name: 'Test Server 2',
            version: '1.0.0',
        });

        server2.tool('tool3', { test: z.string() }, async ({ test }) => ({
            content: [
                { type: 'text', text: `Tool 3 executed with params: ${JSON.stringify({ test })}` },
            ],
        }));

        it('should register multiple MCP servers with tools and call all tools', async () => {

            const gateway = new IntegrationsGateway([
                {
                    id: 'Test Server 1',
                    mcpServer: server
                },
                {
                    id: 'Test Server 2',
                    mcpServer: server2
                }
            ]);

            const allTools = await gateway.getAllTools();
            expect(allTools.length).toBe(2);
            expect(allTools.map(tool => tool.name)).toEqual(['Test Server 1:add', 'Test Server 2:tool3']);
        });

        it('should allow to call a tool', async () => {
            const gateway = new IntegrationsGateway([
                {
                    id: 'Test Server 1',
                    mcpServer: server
                },
                {
                    id: 'Test Server 2',
                    mcpServer: server2
                }
            ]);

            const result = await gateway.executeTool('Test Server 1:add', { a: 1, b: 2 });
            expect(result).toEqual({ content: [{ type: 'text', text: '3' }] });
        });
    });
});
