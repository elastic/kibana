/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { StructuredTool, tool as langchainTool } from '@langchain/core/tools';
import { jsonSchemaToZod, JsonSchemaObject } from '@n8n/json-schema-to-zod';
import { IntegrationTool } from '../../types';
import { IntegrationsService } from './integrations_service';

export async function getLCTools(
  integrationService: IntegrationsService
): Promise<StructuredTool[]> {
  const tools = await integrationService.getAllTools();
  return tools.map((tool) => {
    return convertToLCTool(tool, async (input) => {
      const result = await integrationService.executeTool(tool.name, input);
      return JSON.stringify(result);
    });
  });
}

function convertToLCTool(
  integrationTool: IntegrationTool,
  action: (input: any) => Promise<string>
): StructuredTool {
  const schema = jsonSchemaToZod(
    integrationTool.inputSchema as unknown as JsonSchemaObject
  ) as z.ZodObject<any>;

  return langchainTool(action, {
    name: integrationTool.name,
    description: integrationTool.description,
    schema,
  });
}
