/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { MsearchRequestItem } from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/core/server';
import { TRACE_ID } from '@kbn/apm-types';
import type {
  ObservabilityAgentBuilderCoreSetup,
  ObservabilityAgentBuilderPluginSetupDependencies,
} from '../../types';
import { getObservabilityDataSources } from '../../utils/get_observability_data_sources';
import { parseDatemath } from '../../utils/time';
import { timeRangeFilter, termFilter } from '../../utils/dsl_filters';
import { unwrapEsFields } from '../../utils/unwrap_es_fields';
import { getTotalHits } from '../../utils/get_total_hits';
import { getTraceIds } from './get_trace_ids';

export async function fetchTraceDocuments({
  esClient,
  traceIds,
  index,
  startTime,
  endTime,
  size,
  fields,
}: {
  esClient: IScopedClusterClient;
  traceIds: string[];
  index: string[];
  startTime: number;
  endTime: number;
  size: number;
  fields: string[];
}): Promise<
  {
    items: Record<string, unknown>[];
    error?: string;
    isTruncated: boolean;
  }[]
> {
  const searches: MsearchRequestItem[] = traceIds.flatMap((traceId) => [
    { index },
    {
      track_total_hits: size + 1, // +1 to determine if results are truncated
      size,
      sort: [{ '@timestamp': { order: 'asc' } }],
      _source: false,
      fields,
      query: {
        bool: {
          filter: [
            ...timeRangeFilter('@timestamp', { start: startTime, end: endTime }),
            ...termFilter(TRACE_ID, traceId),
          ],
        },
      },
    },
  ]);
  const msearchResponse = await esClient.asCurrentUser.msearch({
    searches,
  });
  return msearchResponse.responses.map((response, responseIndex) => {
    const traceId = traceIds[responseIndex];
    if ('error' in response) {
      return {
        items: [],
        error: `Failed to fetch trace documents for trace.id ${traceId}: ${response.error.type}: ${response.error.reason}`,
        isTruncated: false,
      };
    }

    return {
      items: response.hits.hits.map((hit) => unwrapEsFields(hit.fields)),
      isTruncated: getTotalHits(response) > size,
    };
  });
}

export async function getToolHandler({
  core,
  plugins,
  logger,
  esClient,
  start,
  end,
  index,
  kqlFilter,
  fields,
  maxTraces,
  maxDocsPerTrace,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  logger: Logger;
  esClient: IScopedClusterClient;
  start: string;
  end: string;
  index?: string;
  kqlFilter: string;
  fields: string[];
  maxTraces: number;
  maxDocsPerTrace: number;
}) {
  const dataSources = await getObservabilityDataSources({ core, plugins, logger });
  const apmIndexPatterns = [
    dataSources.apmIndexPatterns.transaction,
    dataSources.apmIndexPatterns.span,
    dataSources.apmIndexPatterns.error,
  ];
  const indices = index?.split(',') ?? [...dataSources.logIndexPatterns, ...apmIndexPatterns];
  const startTime = parseDatemath(start);
  const endTime = parseDatemath(end, { roundUp: true });

  const traceIds = await getTraceIds({
    esClient,
    indices,
    startTime,
    endTime,
    kqlFilter,
    logger,
    maxTraces,
  });

  if (traceIds.length === 0) {
    return { traces: [] };
  }
  // For each trace.id, we want to fetch all documents with an extended time window to try capture the full trace (transactions, spans, errors, and logs)
  const traceTimeWindow = {
    start: moment(startTime).subtract(5, 'minutes').valueOf(),
    end: moment(endTime).add(5, 'minutes').valueOf(),
  };
  const traces = await fetchTraceDocuments({
    esClient,
    traceIds,
    index: indices,
    startTime: traceTimeWindow.start,
    endTime: traceTimeWindow.end,
    size: maxDocsPerTrace,
    fields,
  });

  return { traces };
}
