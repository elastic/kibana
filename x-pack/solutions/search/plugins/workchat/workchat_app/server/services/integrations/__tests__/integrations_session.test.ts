import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { InternalIntegration } from '../integration';
import { IntegrationPlugin, InternalIntegrationServices } from '@kbn/wci-common';
import { IntergrationsSession } from '../integrations_session';
import { IntegrationToolInputSchema } from '@kbn/workchat-app/server/types';

describe('IntegrationsGateway', () => {
    describe('MCP servers with tools', () => {

        const integration = new InternalIntegration('Test Server 1', {
            name: 'Test Server 1',
            mcpServer(configuration: Record<string, any>, services: InternalIntegrationServices) {
                expect(configuration).toEqual({});
                expect(services).toEqual({});
                
                const server = new McpServer({
                    name: 'Test Server 1',
                    version: '1.0.0',
                });
        
                server.tool('add', { a: z.number(), b: z.number() }, async ({ a, b }) => ({
                    content: [{ type: 'text', text: String(a + b) }],
                }));

                return server;

            },
        } as unknown as IntegrationPlugin, {});

        const integration2 = new InternalIntegration('Test Server 2', {
            name: "mcp_server_2",
            mcpServer(configuration: Record<string, any>, services: InternalIntegrationServices) {
                
                const server = new McpServer({
                    name: 'Test Server 2',
                    version: '1.0.0',
                });
        
                server.tool('tool3', { test: z.string() }, async ({ test }) => ({
                    content: [
                        { type: 'text', text: `Tool 3 executed with params: ${JSON.stringify({ test })}` },
                    ],
                }));

                return server;

            },
        } as unknown as IntegrationPlugin, {});


        it('should register multiple MCP servers with tools and call all tools', async () => {

            const services = {} as InternalIntegrationServices;

            const integrationSession = new IntergrationsSession(services, [integration, integration2]);

            const allTools = await integrationSession.getAllTools();
            expect(allTools.length).toBe(2);
            expect(allTools.map(tool => tool.name)).toEqual(['Test Server 1___add', 'Test Server 2___tool3']);
            
        });

        it('should allow to call a tool', async () => {
            const services = {} as InternalIntegrationServices;
            const integrationSession = new IntergrationsSession(services, [integration, integration2]);

            const result = await integrationSession.executeTool('Test Server 1___add', { a: 1, b: 2 } as unknown as IntegrationToolInputSchema);
            expect(result).toEqual({ content: [{ type: 'text', text: '3' }] });
        });
    });
});
