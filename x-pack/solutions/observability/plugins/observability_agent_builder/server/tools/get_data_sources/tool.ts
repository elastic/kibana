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
import type { CoreSetup, Logger } from '@kbn/core/server';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import type {
  ObservabilityAgentBuilderPluginSetupDependencies,
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from '../../types';
import { getToolHandler } from './handler';

export const OBSERVABILITY_GET_DATA_SOURCES_TOOL_ID = 'observability.get_data_sources';

const getDataSourcesSchema = z.object({});

export function createGetDataSourcesTool({
  core,
  plugins,
  logger,
}: {
  core: CoreSetup<
    ObservabilityAgentBuilderPluginStartDependencies,
    ObservabilityAgentBuilderPluginStart
  >;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  logger: Logger;
}): StaticToolRegistration<typeof getDataSourcesSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof getDataSourcesSchema> = {
    id: OBSERVABILITY_GET_DATA_SOURCES_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Lists the Elasticsearch indices and index patterns where observability data (logs, metrics, traces, alerts) is stored. Essential for determining the correct indices to target in subsequent queries.',
    schema: getDataSourcesSchema,
    tags: ['observability'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async () => {
      try {
        const data = await getToolHandler({ core, plugins, logger });

        return {
          results: [
            {
              type: ToolResultType.other,
              data,
            },
          ],
        };
      } catch (error) {
        logger.error(`Error getting observability data sources: ${error.message}`);
        logger.debug(error);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to retrieve observability data sources: ${error.message}`,
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
