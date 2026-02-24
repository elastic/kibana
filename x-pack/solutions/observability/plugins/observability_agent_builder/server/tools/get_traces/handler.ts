/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/core/server';
import type {
  ObservabilityAgentBuilderCoreSetup,
  ObservabilityAgentBuilderPluginSetupDependencies,
} from '../../types';
import { getObservabilityDataSources } from '../../utils/get_observability_data_sources';
import { parseDatemath } from '../../utils/time';
import { getTraceIds } from './get_trace_ids';
import { DEFAULT_TRACE_FIELDS, DEFAULT_MAX_TRACES, DEFAULT_MAX_DOCS_PER_TRACE } from './constants';

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
import { getTraceDocuments } from './get_trace_documents';
import { DEFAULT_TRACE_FIELDS } from './constants';

export async function getToolHandler({
  core,
  plugins,
  logger,
  esClient,
  start,
  end,
  index,
  kqlFilter,
  fields = DEFAULT_TRACE_FIELDS,
  maxTraces = DEFAULT_MAX_TRACES,
  maxDocsPerTrace = DEFAULT_MAX_DOCS_PER_TRACE,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  logger: Logger;
  esClient: IScopedClusterClient;
  start: string;
  end: string;
  index?: string;
  kqlFilter: string;
  fields?: string[];
  maxTraces: number;
  maxDocsPerTrace: number;
}) {
  const dataSources = await getObservabilityDataSources({ core, plugins, logger });
  const apmIndexPatterns = [
    dataSources.apmIndexPatterns.transaction,
    dataSources.apmIndexPatterns.span,
    dataSources.apmIndexPatterns.error,
  ].flatMap((pattern) => pattern.split(','));

  const allObservabilityIndices = [...apmIndexPatterns, ...dataSources.logIndexPatterns];

  const startTime = parseDatemath(start);
  const endTime = parseDatemath(end, { roundUp: true });

  const traceIds = await getTraceIds({
    esClient,
    indices: index?.split(',') ?? allObservabilityIndices,
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
  const traces = await getTraceDocuments({
    esClient,
    traceIds,
    index: allObservabilityIndices,
    startTime: traceTimeWindow.start,
    endTime: traceTimeWindow.end,
    size: maxDocsPerTrace,
    fields,
  });

  return { traces };
}
