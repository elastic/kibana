/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient } from '@kbn/core/server';
import { orderBy } from 'lodash';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type {
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from '../../types';
import { getLogsIndices } from '../../utils/get_logs_indices';
import { getTotalHits } from '../../utils/get_total_hits';
import { type Bucket, getChangePoints } from '../../utils/get_change_points';
import { parseDatemath } from '../../utils/time';
import { timeRangeFilter, kqlFilter } from '../../utils/dsl_filters';
import { getTypedSearch } from '../../utils/get_typed_search';

function getProbability(totalHits: number): number {
  const probability = Math.min(1, 500_000 / totalHits);
  return probability > 0.5 ? 1 : probability;
}

async function getLogChangePoint({
  name,
  index,
  start,
  end,
  kqlFilter: kqlFilterValue,
  field,
  esClient,
}: {
  name: string;
  index: string;
  start: string;
  end: string;
  kqlFilter?: string;
  field: string;
  esClient: IScopedClusterClient;
}) {
  const countDocumentsResponse = await esClient.asCurrentUser.search({
    size: 0,
    track_total_hits: true,
    index,
    query: {
      bool: {
        filter: [
          ...timeRangeFilter('@timestamp', {
            start: parseDatemath(start),
            end: parseDatemath(end),
          }),
          ...kqlFilter(kqlFilterValue),
        ],
      },
    },
  });

  const totalHits = getTotalHits(countDocumentsResponse);

  if (totalHits === 0) {
    return [];
  }

  const aggregations = {
    sampler: {
      random_sampler: {
        probability: getProbability(totalHits),
      },
      aggs: {
        groups: {
          categorize_text: {
            field,
            size: 1000,
          },
          aggs: {
            over_time: {
              auto_date_histogram: {
                field: '@timestamp',
                buckets: 100,
              },
            },
            changes: {
              change_point: {
                buckets_path: 'over_time>_count',
              },
              // elasticsearch@9.0.0 change_point aggregation is missing in the types: https://github.com/elastic/elasticsearch-specification/issues/3671
            } as AggregationsAggregationContainer,
          },
        },
      },
    },
  };

  const search = getTypedSearch(esClient.asCurrentUser);

  const response = await search({
    index,
    size: 0,
    track_total_hits: false,
    query: {
      bool: {
        filter: [
          ...timeRangeFilter('@timestamp', {
            start: parseDatemath(start),
            end: parseDatemath(end),
          }),
          ...kqlFilter(kqlFilterValue),
        ],
      },
    },
    aggs: aggregations,
  });

  const buckets = response.aggregations?.sampler?.groups?.buckets;

  if (!buckets) {
    return [];
  }

  return await getChangePoints({
    name,
    buckets: buckets as Bucket[],
  });
}

export async function getToolHandler({
  core,
  logger,
  esClient,
  start,
  end,
  logs,
}: {
  core: CoreSetup<
    ObservabilityAgentBuilderPluginStartDependencies,
    ObservabilityAgentBuilderPluginStart
  >;
  logger: Logger;
  esClient: IScopedClusterClient;
  start: string;
  end: string;
  logs: {
    name: string;
    index?: string;
    kqlFilter?: string;
    field?: string;
  }[];
}) {
  if (logs.length === 0) {
    throw new Error('No logs found');
  }

  const logIndexPatterns = await getLogsIndices({ core, logger });

  const logChangePoints = await Promise.all(
    logs.map(async (log) => {
      return await getLogChangePoint({
        name: log.name,
        index: log.index || logIndexPatterns.join(','),
        esClient,
        start,
        end,
        kqlFilter: log.kqlFilter,
        field: log.field ?? 'message',
      });
    })
  );

  return orderBy(logChangePoints.flat(), [
    (item) => item.changes.p_value ?? Number.POSITIVE_INFINITY,
  ]).slice(0, 25);
}
