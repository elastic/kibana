import { IntegrationTool, IntegrationToolInputSchema } from "../../types";
import { StructuredTool, tool } from "@langchain/core/tools";
import { IntegrationsService } from "./integrations_service";
import { jsonSchemaToZod, JsonSchemaObject } from "@n8n/json-schema-to-zod";
import { z } from "zod";

export async function getLCTools(integrationService: IntegrationsService): Promise<StructuredTool[]> {
    const tools = await integrationService.getAllTools();
    return tools.map(tool => convertToLCTool(tool, async (input) => {
        const result = await integrationService.executeTool(tool.name, input);
        return JSON.stringify(result);
    }));
}

function convertToLCTool(integrationTool: IntegrationTool, action: (input: any) => Promise<string>): StructuredTool {

  const schema = jsonSchemaToZod(integrationTool.inputSchema as unknown as JsonSchemaObject) as z.ZodObject<any>;
    
  return tool(
    action,
    {
      name: integrationTool.name,
      description: integrationTool.description,
      schema: schema,
    }
  )
}