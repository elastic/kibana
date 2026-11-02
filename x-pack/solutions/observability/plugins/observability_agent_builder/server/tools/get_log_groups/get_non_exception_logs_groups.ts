/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type {
  QueryDslBoolQuery,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import { ERROR_EXC_TYPE } from '@kbn/apm-types/es_fields';
import type { ObservabilityAgentBuilderCoreSetup } from '../../types';
import { getLogsIndices } from '../../utils/get_logs_indices';
import { timeRangeFilter, kqlFilter } from '../../utils/dsl_filters';
import { warningAndAboveLogFilter } from '../../utils/warning_and_above_log_filter';
import { getCategorizedLogs, getSamplingProbability } from './get_categorized_logs';

export async function getNonExceptionLogGroups({
  core,
  logger,
  esClient,
  index,
  startMs,
  endMs,
  kqlFilter: kuery,
  fields,
  size,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  logger: Logger;
  esClient: IScopedClusterClient;
  index?: string;
  startMs: number;
  endMs: number;
  kqlFilter?: string;
  fields: string[];
  size: number;
}) {
  const logsIndices = index?.split(',') ?? (await getLogsIndices({ core, logger }));
  const boolFilters = [
    ...timeRangeFilter('@timestamp', { start: startMs, end: endMs }),
    ...kqlFilter(kuery),
    { exists: { field: 'message' } },
    { bool: { must_not: { exists: { field: ERROR_EXC_TYPE } } } },
  ] as QueryDslQueryContainer[];

  const [highSeverityCategories, lowSeverityCategories] = await Promise.all([
    getNonExceptionLogGroupsWithQuery({
      esClient,
      logsIndices,
      boolQuery: { filter: boolFilters, must: [warningAndAboveLogFilter()] },
      logger,
      size,
      fields,
    }),
    getNonExceptionLogGroupsWithQuery({
      esClient,
      logsIndices,
      boolQuery: { filter: boolFilters, must_not: [warningAndAboveLogFilter()] },
      logger,
      size,
      fields,
    }),
  ]);

  return [...(highSeverityCategories ?? []), ...(lowSeverityCategories ?? [])];
}

export async function getNonExceptionLogGroupsWithQuery({
  esClient,
  logsIndices,
  boolQuery,
  logger,
  size,
  fields,
}: {
  esClient: IScopedClusterClient;
  logsIndices: string[];
  boolQuery: QueryDslBoolQuery;
  logger: Logger;
  size: number;
  fields: string[];
}) {
  const { samplingProbability, totalHits } = await getSamplingProbability({
    esClient,
    index: logsIndices,
    boolQuery,
  });

  if (totalHits === 0) {
    logger.debug(`No log documents found, filter: ${JSON.stringify(boolQuery)}`);
    return undefined;
  }

  logger.debug(
    `Total log documents: ${totalHits}, using sampling probability: ${samplingProbability.toFixed(
      4
    )}, filter: ${JSON.stringify(boolQuery)}`
  );

  return getCategorizedLogs({
    esClient,
    index: logsIndices,
    boolQuery,
    samplingProbability,
    size,
    messageField: 'message',
    fields,
    type: 'log',
  });
}
