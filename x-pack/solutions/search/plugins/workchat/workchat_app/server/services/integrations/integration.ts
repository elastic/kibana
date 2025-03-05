import { IntegrationPlugin } from "@kbn/wci-common";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export class Integration {

    mcpServer: McpServer;

    constructor(
        public id: string,
        public typeInstance: IntegrationPlugin,
        public configuration: Record<string, any>
    ) {
        this.mcpServer = typeInstance.mcpServer(configuration);
    }
    
}