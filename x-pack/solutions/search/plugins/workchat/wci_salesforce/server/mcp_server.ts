import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
/**
 * Returns an MCP server instance configured with the necessary handlers.
 */
export function getMcpServer(): McpServer {
  const server = new McpServer({
    name: "wci-salesforce",
    version: "1.0.0"
  });

  server.tool("echo", "echo a message", { message: z.string() }, async ({ message }) => ({
    content: [{ type: "text", text: message }]
  }));

  return server;
}