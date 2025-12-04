/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/onechat-common';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/onechat-server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type {
  ObservabilityAgentPluginSetupDependencies,
  ObservabilityAgentPluginStart,
  ObservabilityAgentPluginStartDependencies,
} from '../../types';
import { runElasticsearchTool } from './run_elasticsearch_tool';
export const OBSERVABILITY_ELASTICSEARCH_TOOL_ID = 'observability.elasticsearch';

const schema = z.object({
  query: z.string().describe('a query to search documents in Elasticsearch OpenAPI index.'),
  nlQuery: z
    .string()
    .describe('A natural language query to describe the Elasticsearch operation to perform.'),
});

export function createObservabilityElasticsearchTool({
  core,
  plugins,
  logger,
}: {
  core: CoreSetup<ObservabilityAgentPluginStartDependencies, ObservabilityAgentPluginStart>;
  plugins: ObservabilityAgentPluginSetupDependencies;
  logger: Logger;
}): StaticToolRegistration<typeof schema> {
  const toolDefinition: BuiltinToolDefinition<typeof schema> = {
    id: OBSERVABILITY_ELASTICSEARCH_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Executes Elasticsearch API calls by searching the Elasticsearch API documentation index for relevant endpoints based on a natural language query, then dynamically selecting and calling the most appropriate API.',
    schema,
    tags: ['observability'],
    handler: async ({ query, nlQuery }, toolHandlerContext) => {
      logger.debug(`elasticsearch tool called with query: ${query}`);
      const results = await runElasticsearchTool({
        nlQuery,
        query,
        toolHandlerContext,
      });
      return { results };
    },
  };
  return toolDefinition;
}
