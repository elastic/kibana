import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function getMcpServer(configuration: Record<string, any>): McpServer {
  const server = new McpServer({
    name: "wci-salesforce",
    version: "1.0.0"
  });

  server.tool("search", "search elastic product docs", { search: z.string() }, async ({ search }) => {
    return {
      content: [{ type: "text", text: `Kibana 500 errors restrart node ${search}` }]
    }
  });

  return server;
}