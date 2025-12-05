/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/onechat-common';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/onechat-server';
import type { CoreSetup, IScopedClusterClient, Logger } from '@kbn/core/server';
import type { QueryDslBoolQuery } from '@elastic/elasticsearch/lib/api/types';
import type {
  ObservabilityAgentPluginStart,
  ObservabilityAgentPluginStartDependencies,
} from '../../types';
import { getLogsIndices } from '../../utils/get_logs_indices';
import { getTypedSearch } from '../../utils/get_typed_search';
import { getHitsTotal } from '../../utils/get_hits_total';
import { getShouldMatchOrNotExistFilter } from '../../utils/get_should_match_or_not_exist_filter';
import { timeRangeFilter } from '../../utils/dsl_filters';
import { parseDatemath } from '../../utils/time';
import { timeRangeSchemaOptional, indexDescription } from '../../utils/tool_schemas';

export interface GetLogCategoriesToolResult {
  type: ToolResultType.other;
  data: {
    highSeverityCategories: Awaited<ReturnType<typeof getFilteredLogCategories>>;
    lowSeverityCategories: Awaited<ReturnType<typeof getFilteredLogCategories>>;
  };
}

const DEFAULT_TIME_RANGE = {
  start: 'now-1h',
  end: 'now',
};

export const OBSERVABILITY_GET_LOG_CATEGORIES_TOOL_ID = 'observability.get_log_categories';

const getLogsSchema = z.object({
  ...timeRangeSchemaOptional(DEFAULT_TIME_RANGE),
  index: z.string().describe(indexDescription).optional(),
  terms: z
    .record(z.string(), z.string())
    .optional()
    .describe(
      'Optional field filters to narrow down results. Each key-value pair filters logs where the field exactly matches the value. Example: { "service.name": "payment", "host.name": "web-server-01" }. Multiple filters are combined with AND logic.'
    ),
});

export function createGetLogCategoriesTool({
  core,
  logger,
}: {
  core: CoreSetup<ObservabilityAgentPluginStartDependencies, ObservabilityAgentPluginStart>;
  logger: Logger;
}): StaticToolRegistration<typeof getLogsSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof getLogsSchema> = {
    id: OBSERVABILITY_GET_LOG_CATEGORIES_TOOL_ID,
    type: ToolType.builtin,
    description: `Retrieves and categorizes log messages into distinct patterns for a specified time range, providing counts and samples for each category. Useful for identifying high-volume or recurring log events.`,
    schema: getLogsSchema,
    tags: ['observability', 'logs'],
    handler: async (
      { index, start = DEFAULT_TIME_RANGE.start, end = DEFAULT_TIME_RANGE.end, terms },
      { esClient }
    ) => {
      try {
        const logsIndices = index?.split(',') ?? (await getLogsIndices({ core, logger }));
        const boolFilters = [
          ...timeRangeFilter('@timestamp', {
            ...getShouldMatchOrNotExistFilter(terms),
            start: parseDatemath(start),
            end: parseDatemath(end, { roundUp: true }),
          }),
          { exists: { field: 'message' } },
        ];

        const lowSeverityLogLevels = [
          {
            terms: {
              'log.level': ['trace', 'debug', 'info'].flatMap((level) => [
                level.toLowerCase(),
                level.toUpperCase(),
              ]),
            },
          },
        ];

        const [highSeverityCategories, lowSeverityCategories] = await Promise.all([
          getFilteredLogCategories({
            esClient,
            logsIndices,
            boolQuery: { filter: boolFilters, must_not: lowSeverityLogLevels },
            logger,
            categoryCount: 20,
            terms,
          }),
          getFilteredLogCategories({
            esClient,
            logsIndices,
            boolQuery: { filter: boolFilters, must: lowSeverityLogLevels },
            logger,
            categoryCount: 10,
            terms,
          }),
        ]);

        return {
          results: [
            {
              type: ToolResultType.other,
              data: { highSeverityCategories, lowSeverityCategories },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error fetching log categories: ${error.message}`);
        logger.debug(error);

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to fetch log categories: ${error.message}`,
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

async function getFilteredLogCategories({
  esClient,
  logsIndices,
  boolQuery,
  logger,
  categoryCount,
  terms,
}: {
  esClient: IScopedClusterClient;
  logsIndices: string[];
  boolQuery: QueryDslBoolQuery;
  logger: Logger;
  categoryCount: number;
  terms: Record<string, string> | undefined;
}) {
  const search = getTypedSearch(esClient.asCurrentUser);

  // Count total documents to determine sampling probability
  const countResponse = await search({
    index: logsIndices,
    size: 0,
    track_total_hits: true,
    query: { bool: boolQuery },
  });

  const totalHits = getHitsTotal(countResponse);
  if (totalHits === 0) {
    logger.debug('No log documents found for the given query.');
    return undefined;
  }

  // Calculate sampling probability to get ~10,000 samples
  const targetSampleSize = 10000;
  const rawSamplingProbability = targetSampleSize / totalHits;
  const samplingProbability = rawSamplingProbability < 0.5 ? rawSamplingProbability : 1; // probability must be between 0.0 and 0.5 or exactly 1.0

  logger.debug(
    `Total log documents: ${totalHits}, using sampling probability: ${samplingProbability.toFixed(
      4
    )} using filter: ${JSON.stringify(boolQuery)}`
  );

  const response = await search({
    index: logsIndices,
    size: 0,
    track_total_hits: false,
    query: { bool: boolQuery },
    aggregations: {
      sampler: {
        random_sampler: { probability: samplingProbability, seed: 1 },
        aggs: {
          categories: {
            categorize_text: {
              field: 'message',
              size: categoryCount,
              min_doc_count: 1,
            },
            aggs: {
              sample: {
                top_hits: {
                  size: 1,
                  _source: false,
                  fields: ['message', '@timestamp', ...Object.keys(terms ?? {})],
                  sort: {
                    '@timestamp': { order: 'desc' },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const categories =
    response.aggregations?.sampler?.categories?.buckets?.map((bucket) => ({
      pattern: bucket.key,
      regex: bucket.regex,
      count: bucket.doc_count,
      sample: bucket.sample?.hits?.hits?.[0]?.fields,
    })) ?? [];

  return { categories, totalHits, samplingProbability };
}
