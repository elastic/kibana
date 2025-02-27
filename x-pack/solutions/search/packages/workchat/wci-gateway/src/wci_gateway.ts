import { createTransport } from "./mcp/in_memory_transport";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

interface WCITool {
    name: string;
    description: string;
    inputSchema: Record<string, any>;
}

export class WCIGateway {

    private servers: Map<string, McpServer> = new Map();
    private clients: Map<string, Client> = new Map();

    async registerServer(name: string, server: McpServer) {

        const { clientTransport, serverTransport } = createTransport();

        const client = new Client({
            name: name,
            version: "1.0.0"
        });

        server.connect(clientTransport);
        client.connect(serverTransport);

        this.servers.set(name, server);
        this.clients.set(name, client);
    }

    async getAllTools(): Promise<WCITool[]> {
        const toolCalls = await Promise.all(Array.from(this.clients.entries()).map(async ([clientKey, client]) => {
            const toolsResponse = await client.listTools();
            if (toolsResponse && toolsResponse.tools && Array.isArray(toolsResponse.tools)) {
                return toolsResponse.tools.map(tool => ({
                    name: `${clientKey}:${tool.name}`,
                    description: tool.description || '',
                    inputSchema: tool.inputSchema || {},
                }));
            }
            return [];
        }));
        return toolCalls.flat();
    }

    async getServer(type: string) {
        return this.servers.get(type);
    }

    async executeTool(serverToolName: string, params: Record<string, any>) {
        const [clientKey, toolName] = serverToolName.split(':');
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
