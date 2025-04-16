/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { tool } from '@langchain/core/tools';
import { requestHasRequiredAnonymizationParams } from '@kbn/elastic-assistant-plugin/server/lib/langchain/helpers';
import type { AssistantTool, AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import { contentReferenceString, securityAlertsPageReference } from '@kbn/elastic-assistant-common';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { loadMcpTools } from '@langchain/mcp-adapters';
import { APP_UI_ID } from '../../../../common';
import { getAlertsCountQuery } from './get_alert_counts_query';

export interface MCPToolParams extends AssistantToolParams {
  alertsIndexPattern: string;
}
export const MCP_TOOL_DESCRIPTION = 'Call this for access to MCP server';

export const MCP_TOOL: AssistantTool = {
  id: 'mcp-tool',
  name: 'MCPTool',
  // note: this description is overwritten when `getTool` is called
  // local definitions exist ../elastic_assistant/server/lib/prompt/tool_prompts.ts
  // local definitions can be overwritten by security-ai-prompt integration definitions
  description: MCP_TOOL_DESCRIPTION,
  sourceRegister: APP_UI_ID,
  isSupported: (params: AssistantToolParams): params is MCPToolParams => {
    const { request, alertsIndexPattern } = params;
    const orig = requestHasRequiredAnonymizationParams(request) && alertsIndexPattern != null;
    return true;
  },
  getTool(params: AssistantToolParams) {
    if (!this.isSupported(params)) return null;
    const { alertsIndexPattern, esClient, contentReferencesStore } = params as MCPToolParams;
    return tool(
      async () => {
        const query = getAlertsCountQuery(alertsIndexPattern);
        const result = await esClient.search<SearchResponse>(query);
        const alertsCountReference = contentReferencesStore?.add((p) =>
          securityAlertsPageReference(p.id)
        );

        const reference = `\n${contentReferenceString(alertsCountReference)}`;

        // return `${JSON.stringify(result)}${reference}`;

        // Create transport for stdio connection
        const transport = new StdioClientTransport({
          command: 'npm',
          args: ['--silent', '--prefix', '/Users/eyalkraft/Workspace/elastic/aws-mcp', 'start'],
        });

        // Initialize the client
        const client = new Client({
          name: 'aws-mcp-client',
          version: '1.0.0',
        });

        try {
          // Connect to the transport
          await client.connect(transport);

          // Get tools
          const tools = await loadMcpTools('aws', client);
        } catch (e) {
          console.error(e);
        }

        return 'This is a test 42';
      },
      {
        name: 'MCPTool',
        description: params.description || MCP_TOOL_DESCRIPTION,
        tags: ['mcp'],
      }
    );
  },
};

// // Initialize the ChatOpenAI model
// const model = new ChatOpenAI({ modelName: 'gpt-4' });
//
// try {
//   // Create and run the agent
//   const agent = createReactAgent({ llm: model, tools });
//   const agentResponse = await agent.invoke({
//     messages: [{ role: 'user', content: "what's (3 + 5) x 12?" }],
//   });
//   console.log(agentResponse);
// } catch (e) {
//   console.error(e);
// } finally {
//   // Clean up connection
//   await client.close();
// }
