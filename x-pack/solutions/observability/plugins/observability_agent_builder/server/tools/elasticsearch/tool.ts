/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';
import { z } from '@kbn/zod/v4';
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
    description: dedent(`
      Executes Elasticsearch API calls by dynamically searching Elasticsearch API documentation for the right endpoint and calling it.

      When to use:
      - Running Elasticsearch APIs that no other tool covers (e.g. cluster health, node stats, index mappings, shard allocation, reindex, snapshot management)
      - Querying any index directly with full control over the request body (aggregations, filters, sorting, pagination)

      When NOT to use:
      - For log search and filtering, prefer observability.get_logs — it returns histograms, categories, and samples optimised for incident investigation
      - For APM service health and performance metrics, prefer observability.get_services or observability.get_trace_metrics
      - For infrastructure host metrics, prefer observability.get_hosts
      - For anomaly detection results, prefer observability.get_anomaly_detection_jobs
    `),
    schema: ElasticsearchSchema,
    tags: ['observability', 'elasticsearch'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (
      { nlQuery },
      { modelProvider, esClient, events, request, prompts, stateManager }
    ) => {
      try {
        const response = await getToolHandler({
          core,
          nlQuery,
          modelProvider,
          esClient,
          events,
          request,
          prompts,
          stateManager,
          logger,
        });
        return response;
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
