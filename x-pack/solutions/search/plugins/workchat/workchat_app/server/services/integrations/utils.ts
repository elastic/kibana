import { IntegrationTool } from "../../types";
import { StructuredTool, tool } from "@langchain/core/tools";
import { jsonSchemaToZod } from "@n8n/json-schema-to-zod";
import { IntergrationsSession } from "./integrations_session";

export async function getLCTools(integrationsSession: IntergrationsSession): Promise<StructuredTool[]> {
    const tools = await integrationsSession.getAllTools();
    return tools.map(tool => convertToLCTool(tool, async (input) => {
        const result = await integrationsSession.executeTool(tool.name, input);
        return JSON.stringify(result);
    }));
}

function convertToLCTool(integrationTool: IntegrationTool, action: (input: any) => Promise<string>): StructuredTool {

  const schema = jsonSchemaToZod(integrationTool.inputSchema);
    
  return tool(
    action,
    {
      name: integrationTool.name,
      description: integrationTool.description,
      schema: schema,
    }
  )
}