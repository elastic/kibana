/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit, orderBy } from 'lodash';
import { z } from '@kbn/zod';
import { ToolType } from '@kbn/onechat-common';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import { SavedObjectsClient } from '@kbn/core/server';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import type { AggregationsAutoDateHistogramAggregation } from '@elastic/elasticsearch/lib/api/types';
import type {
  ObservabilityAgentPluginSetupDependencies,
  ObservabilityAgentPluginStart,
  ObservabilityAgentPluginStartDependencies,
} from '../../types';
import { getMetricChangePoint } from './get_metric_change_point';
import { getLogChangePoint } from './get_log_change_point';

export const OBSERVABILITY_GET_LOG_CHANGE_POINT_TOOL_ID = 'observability.get_log_change_point';
export const OBSERVABILITY_GET_METRIC_CHANGE_POINT_TOOL_ID =
  'observability.get_metric_change_point';

const dateHistogram: AggregationsAutoDateHistogramAggregation = {
  field: '@timestamp',
  buckets: 100,
};

const getFilters = ({
  start,
  end,
  kqlFilter,
}: {
  start: string;
  end: string;
  kqlFilter?: string;
}) => {
  const filters = [
    {
      range: {
        '@timestamp': {
          gte: start,
          lt: end,
        },
      },
    },
  ];
  return [...filters, ...(kqlFilter ? [toElasticsearchQuery(fromKueryExpression(kqlFilter))] : [])];
};

const getLogChangesSchema = z.object({
  start: z
    .string()
    .describe('The beginning of the time range, in datemath, like now-24h, or an ISO timestamp'),
  end: z.string().describe('The end of the time range, in datemath, like now, or an ISO timestamp'),
  logs: z
    .array(
      z.object({
        name: z.string().describe('The name of this set of logs'),
        index: z.string().describe('The index or index pattern where to find the logs').optional(),
        kqlFilter: z
          .string()
          .describe('A KQL filter to filter the log documents by, e.g. my_field:foo')
          .optional(),
        field: z
          .string()
          .describe(
            'The text field that contains the message to be analyzed, usually `message`. ONLY use field names from the conversation.'
          )
          .optional(),
      })
    )
    .describe(
      'Analyze changes in log patterns. If no index is given, the default logs index pattern will be used'
    ),
});

export async function createObservabilityGetLogChangePointTool({
  core,
  plugins,
  logger,
}: {
  core: CoreSetup<ObservabilityAgentPluginStartDependencies, ObservabilityAgentPluginStart>;
  plugins: ObservabilityAgentPluginSetupDependencies;
  logger: Logger;
}) {
  const toolDefinition: BuiltinToolDefinition<typeof getLogChangesSchema> = {
    id: OBSERVABILITY_GET_LOG_CHANGE_POINT_TOOL_ID,
    type: ToolType.builtin,
    description: 'Returns change points like spikes and dips for logs.',
    schema: getLogChangesSchema,
    tags: ['observability'],
    handler: async ({ start, end, logs = [] }, { esClient }) => {
      try {
        if (logs.length === 0) {
          throw new Error('No logs were defined');
        }

        const [coreStart, pluginsStart] = await core.getStartServices();
        const savedObjectsClient = new SavedObjectsClient(
          coreStart.savedObjects.createInternalRepository()
        );

        const logSourcesService =
          await pluginsStart.logsDataAccess.services.logSourcesServiceFactory.getLogSourcesService(
            savedObjectsClient
          );

        const logsIndexPattern = await logSourcesService.getFlattenedLogSources();

        const logChanges = await Promise.all([
          ...logs.map(async (log) => {
            const changes = await getLogChangePoint({
              index: log.index || logsIndexPattern,
              esClient,
              filters: getFilters({ start, end, kqlFilter: log.kqlFilter }),
              field: log.field ?? 'message',
              dateHistogram,
            });
            return changes.map((change) => ({
              name: log.name,
              ...change,
            }));
          }),
        ]);

        const allLogChanges = orderBy(logChanges.flat(), [
          (item) => ('p_value' in item.changes ? item.changes.p_value : Number.POSITIVE_INFINITY),
        ]).slice(0, 25);

        const allLogChangesWithoutTimeseries = allLogChanges.flat().map((logChange) => {
          return omit(logChange, 'over_time');
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                content: {
                  description: `For each item, the user can see the type of change, the impact, the timestamp, the trend, and the label.
                  Do not regurgitate these results back to the user.
                  Instead, focus on the interesting changes, mention possible correlations or root causes, and suggest next steps to the user.
                  "indeterminate" means that the system could not detect any changes.`,
                  changes: {
                    logs: allLogChangesWithoutTimeseries,
                  },
                },
                data: {
                  changes: {
                    logs: allLogChanges,
                  },
                },
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error getting log changes: ${error.message}`);
        logger.debug(error);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Error getting log changes: ${error.message}`,
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

const getMetricChangesSchema = z.object({
  start: z
    .string()
    .describe('The beginning of the time range, in datemath, like now-24h, or an ISO timestamp'),
  end: z.string().describe('The end of the time range, in datemath, like now, or an ISO timestamp'),
  metrics: z
    .array(
      z.object({
        name: z.string().describe('The name of this set of metrics'),
        index: z.string().describe('The index or index pattern where to find the metrics'),
        kqlFilter: z
          .string()
          .describe('A KQL filter to filter the log documents by, e.g. my_field:foo')
          .optional(),
        field: z
          .string()
          .describe(
            'Metric field that contains the metric. Only use if the metric aggregation type is not count.'
          )
          .optional(),
        type: z
          .enum(['count', 'avg', 'sum', 'min', 'max', 'p95', 'p99'])
          .describe('The type of metric aggregation to perform. Defaults to count')
          .optional(),
        groupBy: z
          .array(z.string())
          .describe('Optional keyword fields to group metrics by.')
          .optional(),
      })
    )
    .describe(
      'Analyze changes in metrics. DO NOT UNDER ANY CIRCUMSTANCES use date or metric fields for groupBy, leave empty unless needed.'
    ),
});

export async function createObservabilityGetMetricChangePointTool({
  core,
  plugins,
  logger,
}: {
  core: CoreSetup<ObservabilityAgentPluginStartDependencies, ObservabilityAgentPluginStart>;
  plugins: ObservabilityAgentPluginSetupDependencies;
  logger: Logger;
}) {
  const toolDefinition: BuiltinToolDefinition<typeof getMetricChangesSchema> = {
    id: OBSERVABILITY_GET_METRIC_CHANGE_POINT_TOOL_ID,
    type: ToolType.builtin,
    description: 'Returns change points like spikes and dips for metrics.',
    schema: getMetricChangesSchema,
    tags: ['observability'],
    handler: async ({ start, end, metrics = [] }, { esClient }) => {
      try {
        if (metrics.length === 0) {
          throw new Error('No metrics were defined');
        }

        const metricChanges = await Promise.all([
          ...metrics.map(async (metric) => {
            const changes = await getMetricChangePoint({
              index: metric.index,
              esClient,
              filters: getFilters({ start, end, kqlFilter: metric.kqlFilter }),
              groupBy: metric.groupBy ?? [],
              type: metric.type || 'count',
              field: metric.field,
              dateHistogram,
            });

            return changes.map((change) => ({
              name: metric.name,
              ...change,
            }));
          }),
        ]);

        const allMetricChanges = orderBy(metricChanges.flat(), [
          (item) => ('p_value' in item.changes ? item.changes.p_value : Number.POSITIVE_INFINITY),
        ]).slice(0, 25);

        const allMetricChangesWithoutTimeseries = allMetricChanges.flat().map((metricChange) => {
          return omit(metricChange, 'over_time');
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                content: {
                  description: `For each item, the user can see the type of change, the impact, the timestamp, the trend, and the label.
                  Do not regurgitate these results back to the user.
                  Instead, focus on the interesting changes, mention possible correlations or root causes, and suggest next steps to the user.
                  "indeterminate" means that the system could not detect any changes.`,
                  changes: {
                    metrics: allMetricChangesWithoutTimeseries,
                  },
                },
                data: {
                  changes: {
                    metrics: allMetricChanges,
                  },
                },
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error getting metric changes: ${error.message}`);
        logger.debug(error);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Error getting metric changes: ${error.message}`,
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
