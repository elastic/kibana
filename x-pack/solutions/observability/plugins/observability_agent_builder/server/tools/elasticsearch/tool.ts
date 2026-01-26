/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import type {
  ObservabilityAgentBuilderCoreSetup,
  ObservabilityAgentBuilderPluginSetupDependencies,
} from '../../types';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import { getToolHandler } from './handler';
export const OBSERVABILITY_ELASTICSEARCH_TOOL_ID = 'observability.elasticsearch';

const ElasticsearchSchema = z.object({
  nlQuery: z
    .string()
    .describe('A natural language query to describe the Elasticsearch operation to perform.'),
});

export function createElasticsearchTool({
  core,
  plugins,
  logger,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  logger: Logger;
}) {
  const toolDefinition: BuiltinToolDefinition<typeof ElasticsearchSchema> = {
    id: OBSERVABILITY_ELASTICSEARCH_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Executes Elasticsearch API calls by searching the Elasticsearch API documentation index for relevant endpoints based on a natural language query, then dynamically selecting and calling the most appropriate API.',
    schema: ElasticsearchSchema,
    tags: ['observability', 'elasticsearch'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async ({ nlQuery }, { modelProvider, esClient, events, request }) => {
      try {
        const data = await getToolHandler({
          core,
          nlQuery,
          modelProvider,
          esClient,
          events,
          request,
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data,
            },
          ],
        };
      } catch (error) {
        logger.error(`Error executing Elasticsearch tool: ${error.message}`);
        logger.debug(error);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Error executing Elasticsearch tool: ${error.message}`,
                stack: error.stack,
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}
