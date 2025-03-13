/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StructuredTool, tool as toTool } from '@langchain/core/tools';
import { jsonSchemaToZod } from '@n8n/json-schema-to-zod';
import { IntegrationTool } from './types';
import { IntegrationsSession } from './integrations_session';

export async function getLCTools(
  integrationsSession: IntegrationsSession
): Promise<StructuredTool[]> {
  const tools = await integrationsSession.getAllTools();
  return tools.map((tool) =>
    convertToLCTool(tool, async (input) => {
      const result = await integrationsSession.executeTool(tool.name, input);
      return JSON.stringify(result);
    })
  );
}

function convertToLCTool(
  integrationTool: IntegrationTool,
  action: (input: any) => Promise<string>
): StructuredTool {
  const schema = jsonSchemaToZod(integrationTool.inputSchema);

  return toTool(action, {
    name: integrationTool.name,
    description: integrationTool.description,
    schema,
  });
}
