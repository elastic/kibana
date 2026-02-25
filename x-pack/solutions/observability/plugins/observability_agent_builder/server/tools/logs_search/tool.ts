/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import type { ObservabilityAgentBuilderCoreSetup } from '../../types';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import { OBSERVABILITY_LOGS_SEARCH_TOOL_ID } from './constants';
import { logsSearchHandler } from './handler';

const logsSearchSchema = z.object({
  prompt: z
    .string()
    .describe(
      'Natural language question about log data. Examples: ' +
        '"Why did checkout errors spike at 6pm yesterday?", ' +
        '"Find OOM errors in production kubernetes pods in the last 2 hours", ' +
        '"What happened to the payment service between 14:00 and 14:30?"'
    ),
  start: z
    .string()
    .default('now-1h')
    .describe(
      'Start of time range. Elasticsearch date math, e.g. "now-1h", "2026-02-25T14:00:00Z". Defaults to "now-1h".'
    ),
  end: z
    .string()
    .default('now')
    .describe(
      'End of time range. Elasticsearch date math, e.g. "now", "2026-02-25T14:30:00Z". Defaults to "now".'
    ),
  index: z
    .string()
    .default('logs-*')
    .describe('Log index pattern. Defaults to "logs-*".'),
});

export function createLogsSearchTool({
  core,
  logger,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  logger: Logger;
}): StaticToolRegistration<typeof logsSearchSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof logsSearchSchema> = {
    id: OBSERVABILITY_LOGS_SEARCH_TOOL_ID,
    type: ToolType.builtin,
    description: `Autonomous log investigation agent that iteratively searches and filters logs to find root causes.

When to use:
- Investigating error spikes, outages, or performance degradations in log data
- Finding the root cause of incidents by analyzing log patterns
- Answering "what happened?" or "why did X fail?" questions about services

How it works:
- Runs an internal reasoning loop that mimics an SRE using Kibana Discover
- Starts broad, filters noise (health checks, cron jobs), and drills down to the root cause
- Returns a structured analysis with evidence and the investigation trail

Do NOT use for:
- Querying metrics or traces (use dedicated tools)
- Simple log count or volume questions (use execute_esql directly)`,
    schema: logsSearchSchema,
    tags: ['observability', 'logs', 'investigation'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (toolParams, { esClient, modelProvider }) => {
      try {
        const { inferenceClient } = await modelProvider.getDefaultModel();

        const result = await logsSearchHandler({
          params: {
            prompt: toolParams.prompt,
            start: toolParams.start,
            end: toolParams.end,
            index: toolParams.index,
          },
          inferenceClient,
          esClient: esClient.asCurrentUser,
          logger,
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: result,
            },
          ],
        };
      } catch (error) {
        logger.error(`Logs search agent failed: ${error.message}`);
        logger.debug(error);

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Logs search investigation failed: ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}

export { OBSERVABILITY_LOGS_SEARCH_TOOL_ID };
