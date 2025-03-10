import { IntegrationToolInputSchema } from "../../types";
import { IntegrationTool } from "../../types";
import { InternalIntegrationServices } from "@kbn/wci-common";
import { Integration } from "./integration";
import { JsonSchemaObject } from "@n8n/json-schema-to-zod";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

/*
    This class is used to manage the integrations session.
    It is responsible for connecting to the integrations (internal & external) and executing tools.
    It also provides a way to get all the tools from all the integrations.

For internal based integrations:

    At plugin start:
        - Integrations are initialized
        - MCP server is not created

    At Chat session start:
        - MCP server is created, with internal services (actions, elasticsearch) passed to it

    At Chat session end:
        - MCP server is stopped

For external (SSE) based integrations:

    At plugin start:
        - Integrations are initialized
        - MCP isn't connected

    At Chat session start:
        - MCP server is connected, passing in authentication token for the user
        - MCP server deals with own internal services and manages own API Keys (Example: API key to access elasticsearch)

*/
export class IntergrationsSession {

    static TOOL_NAME_SEPARATOR = '___';
    private clients: Record<string, Client>

    constructor(
        public services: InternalIntegrationServices,
        public integrations: Integration[]
    ) {
        this.clients = this.integrations.reduce((acc, integration) => {
            acc[integration.id] = integration.connect(this.services);
            return acc;
        }, {} as Record<string, Client>);
    }

    async getAllTools(): Promise<IntegrationTool[]> {
        const toolCalls = await Promise.all(Object.keys(this.clients).map(async (clientId) => {
            const client = this.clients[clientId];
            const toolsResponse = await client.listTools();
            if (toolsResponse && toolsResponse.tools && Array.isArray(toolsResponse.tools)) {
                return toolsResponse.tools.map(tool => ({
                    name: `${clientId}${IntergrationsSession.TOOL_NAME_SEPARATOR}${tool.name}`,
                    description: tool.description || '',
                    inputSchema: (tool.inputSchema || {}) as JsonSchemaObject
                }));
            }
            return [];
        }));


        return toolCalls.flat();
    }

    async executeTool(serverToolName: string, params: IntegrationToolInputSchema) {
        const [clientKey, toolName] = serverToolName.split(IntergrationsSession.TOOL_NAME_SEPARATOR);
        const client = this.clients[clientKey];
        if (!client) {
            throw new Error(`Client not found: ${clientKey}`);
        }
        return client.callTool({
            name: toolName,
            arguments: params,
        });
    }

    async disconnect() {
        await Promise.all(Object.values(this.clients).map(client => client.close()));
        this.clients = {};
    }
    
}