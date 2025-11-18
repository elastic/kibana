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
import type {
  ObservabilityAgentPluginSetupDependencies,
  ObservabilityAgentPluginStart,
  ObservabilityAgentPluginStartDependencies,
} from '../../types';
import { getObservabilityDataSources } from '../../utils/get_observability_data_sources';

export const OBSERVABILITY_GET_DATA_SOURCES_TOOL_ID = 'observability.get_data_sources';

const getDataSourcesSchema = z.object({});

export function createGetDataSourcesTool({
  core,
  plugins,
  logger,
}: {
  core: CoreSetup<ObservabilityAgentPluginStartDependencies, ObservabilityAgentPluginStart>;
  plugins: ObservabilityAgentPluginSetupDependencies;
  logger: Logger;
}): StaticToolRegistration<typeof getDataSourcesSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof getDataSourcesSchema> = {
    id: OBSERVABILITY_GET_DATA_SOURCES_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Retrieve information about where observability data (logs, metrics, traces, alerts) is stored in Elasticsearch. Use this tool to discover which indices or index patterns to query for different types of observability signals.',
    schema: getDataSourcesSchema,
    tags: ['observability'],
    handler: async () => {
      try {
        const {
          apmIndexPatterns: apmIndices,
          logIndexPatterns,
          metricIndexPatterns,
          alertsIndexPattern,
        } = await getObservabilityDataSources({ core, plugins, logger });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                apm: {
                  indexPatterns: apmIndices,
                },
                logs: {
                  indexPatterns: logIndexPatterns,
                },
                metrics: {
                  indexPatterns: metricIndexPatterns,
                },
                alerts: {
                  indexPattern: alertsIndexPattern,
                },
              },
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
