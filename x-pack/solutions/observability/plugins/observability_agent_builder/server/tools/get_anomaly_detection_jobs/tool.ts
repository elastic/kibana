/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/agent-builder-common';
import type { ErrorResult } from '@kbn/agent-builder-common/tools/tool_result';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/agent-builder-server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import type {
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
  ObservabilityAgentBuilderPluginSetupDependencies,
} from '../../types';
import { timeRangeSchemaOptional } from '../../utils/tool_schemas';
import { getToolHandler } from './handler';

export const OBSERVABILITY_GET_ANOMALY_DETECTION_JOBS_TOOL_ID =
  'observability.get_anomaly_detection_jobs';

const DEFAULT_JOBS_LIMIT = 10;
const DEFAULT_TIME_RANGE = {
  start: 'now-24h',
  end: 'now',
};

export interface GetAnomalyDetectionJobsToolResult {
  type: ToolResultType.other;
  data: {
    jobs: Awaited<ReturnType<typeof getToolHandler>>;
    total: number;
    message?: string;
  };
}

const getAnomalyDetectionJobsSchema = z.object({
  jobIds: z
    .array(z.string().min(1))
    .min(1)
    .max(20)
    .describe(
      'Optional list of ML job IDs to query. Leave empty to include all anomaly detection jobs in this space.'
    )
    .optional(),
  limit: z
    .number()
    .int()
    .min(1)
    .max(25)
    .describe(`Maximum number of jobs to return. Defaults to ${DEFAULT_JOBS_LIMIT}.`)
    .optional(),
  ...timeRangeSchemaOptional(DEFAULT_TIME_RANGE),
});

export function createGetAnomalyDetectionJobsTool({
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
}): StaticToolRegistration<typeof getAnomalyDetectionJobsSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof getAnomalyDetectionJobsSchema> = {
    id: OBSERVABILITY_GET_ANOMALY_DETECTION_JOBS_TOOL_ID,
    type: ToolType.builtin,
    description: `Retrieves Machine Learning anomaly detection jobs and their top anomaly records.

When to use:
- Investigating anomalies in logs, metrics, or traces
- Finding outliers that might indicate problems
- Answering "is anything behaving abnormally?"`,
    schema: getAnomalyDetectionJobsSchema,
    tags: ['observability', 'machine_learning', 'anomaly_detection'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (
      toolParams,
      { esClient, request }
    ): Promise<{
      results: (GetAnomalyDetectionJobsToolResult | Omit<ErrorResult, 'tool_result_id'>)[];
    }> => {
      const {
        jobIds,
        limit: jobsLimit = DEFAULT_JOBS_LIMIT,
        start: rangeStart,
        end: rangeEnd,
      } = toolParams;
      const scopedEsClient = esClient.asCurrentUser;
      const mlClient = scopedEsClient.ml;

      try {
        const mlJobs = await getToolHandler({
          core,
          plugins,
          mlClient,
          request,
          logger,
          jobIds,
          jobsLimit,
          rangeStart,
          rangeEnd,
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                jobs: mlJobs,
                total: mlJobs.length,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error retrieving anomaly detection jobs: ${error.message}`);
        logger.debug(error);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to retrieve anomaly detection jobs: ${error.message}`,
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
