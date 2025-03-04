import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { z } from "zod";
import { IntegrationTool, IntegrationToolInputSchema } from "../../types";
import { Integration } from "./integration";
import { JsonSchemaObject } from "@n8n/json-schema-to-zod";

export class IntegrationsGateway {

    private servers: Map<string, McpServer> = new Map();
    private clients: Map<string, Client> = new Map();

    constructor(integrations: Integration[]) {
        integrations.forEach(integration => this.registerServer(integration.id, integration.mcpServer));
    }

    async registerServer(name: string, server: McpServer) {

        const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

        const client = new Client({
            name: name,
            version: "1.0.0"
        });

        server.connect(clientTransport);
        client.connect(serverTransport);

        this.servers.set(name, server);
        this.clients.set(name, client);
    }

    async getAllTools(): Promise<IntegrationTool[]> {
        const toolCalls = await Promise.all(Array.from(this.clients.entries()).map(async ([clientKey, client]) => {
            const toolsResponse = await client.listTools();
            if (toolsResponse && toolsResponse.tools && Array.isArray(toolsResponse.tools)) {
                return toolsResponse.tools.map(tool => ({
                    name: `${clientKey}___${tool.name}`,
                    description: tool.description || '',
                    inputSchema: tool.inputSchema || {} as JsonSchemaObject
                }));
            }
            return [];
        }));
        // TODO: fix this
        // @ts-ignore
        return toolCalls.flat();
    }

    async getServer(type: string) {
        return this.servers.get(type);
    }

    async executeTool(serverToolName: string, params: IntegrationToolInputSchema) {
        const [clientKey, toolName] = serverToolName.split('___');
        const client = this.clients.get(clientKey);
        if (!client) {
            throw new Error(`Client not found: ${clientKey}`);
        }
        return client.callTool({
            name: toolName,
            arguments: params,
        });
    }
    
}
