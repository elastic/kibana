/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/onechat-common';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import { buildKqlFilter, buildTimeRangeFilter } from '../utils/dsl_filters';
import { getTypedSearch } from '../utils/get_typed_search';
import type {
  ObservabilityAgentPluginSetupDependencies,
  ObservabilityAgentPluginStart,
  ObservabilityAgentPluginStartDependencies,
} from '../types';
import { getApmIndices } from '../utils/get_apm_indices';
import { getLogsIndices } from '../utils/get_logs_indices';
import { timeRangeSchema } from '../utils/tool_schemas';

export const OBSERVABILITY_GET_SERVICES_TOOL_ID = 'observability.get_services';

const createServiceInventorySchema = (indexPatterns: string[]) =>
  z.object({
    timeRange: timeRangeSchema,
    index: z
      .string()
      .min(1)
      .default(indexPatterns.join(','))
      .describe(
        `Comma-separated list of index or data stream patterns to search for services. Defaults to: ${indexPatterns.join(
          ','
        )}.`
      ),
    size: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .default(100)
      .describe('Maximum number of services to return. Defaults to: 100.'),
    timeField: z
      .string()
      .min(1)
      .default('@timestamp')
      .describe(`Timestamp field used when filtering by time. Defaults to: @timestamp.`),
    query: z
      .string()
      .optional()
      .describe('Optional KQL query to further scope the search before aggregating services.'),
  });

export async function createObservabilityGetServicesTool({
  core,
  plugins,
  logger,
}: {
  core: CoreSetup<ObservabilityAgentPluginStartDependencies, ObservabilityAgentPluginStart>;
  plugins: ObservabilityAgentPluginSetupDependencies;
  logger: Logger;
}) {
  const apmIndexPatterns = await getApmIndices({ core, plugins, logger });
  const logIndexPatterns = await getLogsIndices({ core, logger });
  const metricIndexPatterns = ['metrics-*'];

  const defaultIndexPatterns = [...apmIndexPatterns, ...logIndexPatterns, ...metricIndexPatterns];
  const serviceInventorySchema = createServiceInventorySchema(defaultIndexPatterns);

  const toolDefinition: BuiltinToolDefinition<typeof serviceInventorySchema> = {
    id: OBSERVABILITY_GET_SERVICES_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Retrieve a deduplicated list of services observed in the supplied indices, grouped by service.name.',
    schema: serviceInventorySchema,
    tags: ['observability', 'inventory', 'services'],
    handler: async ({ timeRange, index, size, query, timeField }, { esClient }) => {
      const indexPatterns = index ? index.split(',') : defaultIndexPatterns;

      logger.debug(
        `observabilityGetServicesTool: querying indices [${indexPatterns}] for service inventory`
      );

      const typedSearch = getTypedSearch(esClient.asCurrentUser);
      const response = await typedSearch({
        index: indexPatterns,
        allow_no_indices: true,
        ignore_unavailable: true,
        size: 0,
        track_total_hits: false,
        query: {
          bool: {
            filter: [
              buildTimeRangeFilter(timeField, { start: timeRange.start, end: timeRange.end }),
              ...buildKqlFilter(query),
              { exists: { field: 'service.name' } },
            ],
          },
        },
        aggregations: {
          services: {
            terms: {
              field: 'service.name',
              size,
              order: {
                _count: 'desc',
              },
            },
            aggs: {
              by_type: {
                terms: {
                  field: 'data_stream.type',
                  size: 6,
                },
              },
              environments: {
                terms: {
                  field: 'service.environment',
                  size: 10,
                  missing: 'unknown',
                },
              },
              last_seen: {
                max: {
                  field: timeField,
                },
              },
            },
          },
        },
      });

      const servicesAgg = response.aggregations?.services;
      const buckets = servicesAgg?.buckets ?? [];

      const services = buckets.map((bucket) => {
        const byType = bucket.by_type?.buckets ?? [];
        const environments = bucket.environments?.buckets ?? [];

        return {
          serviceName: bucket.key,
          totalDocuments: bucket.doc_count,
          dataStreamTypes: byType.map((typeBucket) => ({
            type: typeBucket.key,
            documents: typeBucket.doc_count,
          })),
          environments: environments.map((env) => ({
            environment: env.key,
            documents: env.doc_count,
          })),
          lastSeen: normalizeEpochToIso(bucket.last_seen?.value),
        };
      });

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              index,
              indices: indexPatterns,
              timeRange: { start: timeRange.start, end: timeRange.end },
              query,
              totalServices: services.length,
              services,
            },
          },
        ],
      };
    },
  };
  return toolDefinition;
}

function normalizeEpochToIso(value: number | null) {
  if (!value) {
    return undefined;
  }

  return new Date(value).toISOString();
}
