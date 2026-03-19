/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import {
  ERROR_EXC_MESSAGE,
  ERROR_EXC_TYPE,
  EVENT_NAME,
  PROCESSOR_EVENT,
} from '@kbn/apm-types/es_fields';
import type { ObservabilityAgentBuilderCoreSetup } from '../../types';
import { getLogsIndices } from '../../utils/get_logs_indices';
import { timeRangeFilter, kqlFilter } from '../../utils/dsl_filters';
import { getCategorizedLogs, getSamplingProbability } from './get_categorized_logs';

export async function getLogExceptionGroups({
  core,
  esClient,
  index,
  startMs,
  endMs,
  kqlFilter: kqlFilterValue,
  size,
  logger,
  fields,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  esClient: IScopedClusterClient;
  index: string | undefined;
  startMs: number;
  endMs: number;
  kqlFilter: string | undefined;
  size: number;
  logger: Logger;
  fields: string[];
}) {
  const logsIndices = index?.split(',') ?? (await getLogsIndices({ core, logger }));

  if (logsIndices.length === 0) {
    logger.debug('No log indices configured, skipping log exceptions query');
    return [];
  }

  const boolQuery = {
    filter: [
      ...timeRangeFilter('@timestamp', { start: startMs, end: endMs }),
      ...kqlFilter(kqlFilterValue),
    ],
    // Match OTel exception events: either event.name is "exception" or exception.type exists
    should: [{ term: { [EVENT_NAME]: 'exception' } }, { exists: { field: ERROR_EXC_TYPE } }],
    minimum_should_match: 1,
    // Exclude documents already processed by APM (they have processor.event field)
    must_not: [{ exists: { field: PROCESSOR_EVENT } }],
  };

  const { samplingProbability, totalHits } = await getSamplingProbability({
    esClient,
    index: logsIndices,
    boolQuery,
  });

  if (totalHits === 0) {
    logger.debug('No log exceptions found');
    return [];
  }

  logger.debug(
    `Log exceptions: ${totalHits} total, sampling probability: ${samplingProbability.toFixed(4)}`
  );

  return getCategorizedLogs({
    esClient,
    index: logsIndices,
    boolQuery,
    samplingProbability,
    size,
    fields,
    messageField: ERROR_EXC_MESSAGE,
    type: 'logException',
  });
}
