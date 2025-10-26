/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MessageRole, ToolChoiceType, type ToolDefinition } from '@kbn/inference-common';
import type { ToolHandlerContext } from '@kbn/onechat-server';
import { z } from '@kbn/zod';
import { ToolType } from '@kbn/onechat-common';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type { ToolDefinitions } from '@kbn/inference-common/src/chat_complete/tools';
import type {
  ObservabilityAgentPluginSetupDependencies,
  ObservabilityAgentPluginStart,
  ObservabilityAgentPluginStartDependencies,
} from '../types';

export const OBSERVABILITY_ELASTICSEARCH_API_TOOL_ID = 'observability.elasticsearch_api';

export function createElasticsearchApiTool(operation: any): {
  name: string;
  definition: ToolDefinition;
  handler: (
    args: any,
    toolHandlerContext: ToolHandlerContext
  ) => Promise<{ content: { response?: any; consoleCommand: string; error?: string } }>;
} {
  const [method, rawPath] = operation.title.split(' ');

  const toolName = `${method.toLowerCase()}_${rawPath
    .replace(/[\/{}]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')}`;

  const properties: Record<string, any> = {};
  const required: string[] = [];
  for (const param of operation.parameters || []) {
    properties[param.name] = {
      type: param.schema?.type || 'string',
      description: param.description,
    };
    if (param.required) required.push(param.name);
  }

  return {
    name: toolName,
    definition: {
      description: operation.description || operation.summary || operation.title,
      schema: {
        type: 'object',
        properties,
        required,
      },
    },
    handler: async ({
      args,
      toolHandlerContext,
    }: {
      args: any;
      toolHandlerContext: ToolHandlerContext;
    }): Promise<{ content: { response?: any; consoleCommand: string; error?: string } }> => {
      const { esClient } = toolHandlerContext;

      let path = rawPath;
      const pathParams = (operation.parameters || []).filter((p: any) => p.in === 'path');
      for (const p of pathParams) {
        if (!args[p.name] && p.required) {
          throw new Error(`Missing required path param: ${p.name}`);
        }
        path = path.replace(`{${p.name}}`, encodeURIComponent(args[p.name]));
      }

      const queryParams = (operation.parameters || []).filter((p: any) => p.in === 'query');
      const query: Record<string, string> = {};
      for (const p of queryParams) {
        if (args[p.name] != null) query[p.name] = args[p.name];
      }

      // equivalent command for debugging
      const consoleCommand = `${method.toUpperCase()} ${path}${
        Object.keys(query).length
          ? '?' +
            Object.entries(query)
              .map(([k, v]) => `${k}=${v}`)
              .join('&')
          : ''
      }`;

      try {
        const response = await esClient.asCurrentUser.transport.request({
          method,
          path,
          querystring: Object.keys(query).length ? query : undefined,
        });

        return {
          content: { response, consoleCommand },
        };
      } catch (error) {
        return { content: { error: error.message, consoleCommand } };
      }
    },
  };
}

const schema = z.object({
  query: z.string().describe('The query to execute against the Elasticsearch API'),
});

export async function createObservabilityElasticsearchApiTool({
  core,
  plugins,
  logger,
}: {
  core: CoreSetup<ObservabilityAgentPluginStartDependencies, ObservabilityAgentPluginStart>;
  plugins: ObservabilityAgentPluginSetupDependencies;
  logger: Logger;
}) {
  const toolDefinition: BuiltinToolDefinition<typeof schema> = {
    id: OBSERVABILITY_ELASTICSEARCH_API_TOOL_ID,
    type: ToolType.builtin,
    description: 'generate elasticsearch api documentation to assist with elasticsearch queries',
    schema,
    tags: ['observability'],
    handler: async ({ query }, toolHandlerContext) => {
      const { esClient, modelProvider } = toolHandlerContext;

      const esApiDocResponse = await esClient.asCurrentUser.search({
        index: 'kibana_ai_es_api_doc',
        size: 10,
        query: {
          bool: {
            should: [
              // Semantic matches
              { semantic: { field: 'description', query, boost: 2 } },
              { semantic: { field: 'summary', query, boost: 2 } },
              { semantic: { field: 'title', query, boost: 3 } },

              // Lexical fallback
              { match: { description: { query, boost: 1 } } },
              { match: { summary: { query, boost: 1 } } },
              { match: { title: { query, boost: 1 } } },
            ],
            minimum_should_match: 1,
          },
        },
      });

      const esApiDocs = (
        esApiDocResponse as { hits: { hits: Array<{ _source: any }> } }
      ).hits.hits.map((hit: any) => hit._source);

      const toolDefinitions: ToolDefinitions = esApiDocs.reduce(
        (acc: ToolDefinitions, api: ToolDefinition) => {
          const tool = createElasticsearchApiTool(api);
          acc[tool.name] = tool.definition;
          return acc;
        },
        {} as ToolDefinitions
      );

      const toolHandlers = esApiDocs.reduce(
        (
          acc: {
            [key: string]: (
              args: any,
              toolHandlerContext: ToolHandlerContext
            ) => Promise<{
              content: {
                response?: any;
                consoleCommand: string;
                error?: string | undefined;
              };
            }>;
          },
          api: ToolDefinition
        ) => {
          const tool = createElasticsearchApiTool(api);
          acc[tool.name] = tool.handler;
          return acc;
        },
        {}
      );

      const model = await modelProvider.getDefaultModel();

      const response = await model.inferenceClient.chatComplete({
        connectorId: model.connector.connectorId,
        system:
          'you are a helpful assistant that call elasticsearch api to assist with user queries, call at least one tool.',
        messages: [
          {
            role: MessageRole.User,
            content: query,
          },
        ],
        tools: toolDefinitions,
        toolChoice: ToolChoiceType.required,
      });

      const tool = response.toolCalls?.[0]?.function;

      if (tool.name in toolHandlers) {
        const handler = toolHandlers[tool.name];

        const toolResponse = await handler({
          args: tool.arguments,
          toolHandlerContext,
        });
        return {
          results: [
            {
              type: ToolResultType.other,
              data: { response: toolResponse },
            },
          ],
        };
      } else {
        return {
          results: [
            {
              type: ToolResultType.other,
              data: { response: '' },
            },
          ],
        };
      }
    },
  };
  return toolDefinition;
}
