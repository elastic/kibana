/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import type { SearchHit } from '@kbn/es-types';
import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import { ApmDocumentType, RollupInterval } from '@kbn/apm-data-access-plugin/common';
import type {
  ObservabilityAgentBuilderCoreSetup,
  ObservabilityAgentBuilderPluginSetupDependencies,
} from '../../types';
import { getLogsIndices } from '../../utils/get_logs_indices';
import { parseDatemath } from '../../utils/time';
import { buildApmResources } from '../../utils/build_apm_resources';
import { timeRangeFilter, termFilter } from '../../utils/dsl_filters';
import { getTypedSearch } from '../../utils/get_typed_search';
import {
  DEFAULT_MAX_APM_EVENTS,
  DEFAULT_MAX_LOG_EVENTS,
  DEFAULT_LOG_SOURCE_FIELDS,
  DEFAULT_TRACE_FIELDS,
  type TraceSequence,
} from './constants';

export function getApmTraceError({
  apmEventClient,
  traceId,
  start,
  end,
}: {
  apmEventClient: APMEventClient;
  traceId: string;
  start: number;
  end: number;
}) {
  const excludedLogLevels = ['debug', 'info', 'warning'];
  const ERROR_LOG_LEVEL = 'error.log.level';
  return apmEventClient.search('get_errors_docs', {
    apm: {
      sources: [
        {
          documentType: ApmDocumentType.ErrorEvent,
          rollupInterval: RollupInterval.None,
        },
      ],
    },
    track_total_hits: false,
    size: 1000,
    query: {
      bool: {
        filter: [
          ...timeRangeFilter('@timestamp', { start, end }),
          ...termFilter('trace.id', traceId),
        ],
        must_not: { terms: { [ERROR_LOG_LEVEL]: excludedLogLevels } },
      },
    },
    fields: DEFAULT_TRACE_FIELDS,
    _source: false,
  });
}

export function getTraceDocs({
  apmEventClient,
  traceId,
  start,
  end,
}: {
  apmEventClient: APMEventClient;
  traceId: string;
  start: number;
  end: number;
}) {
  return apmEventClient.search('observability_agent_builder_get_trace_docs', {
    apm: {
      events: [ProcessorEvent.transaction, ProcessorEvent.span, ProcessorEvent.error],
    },
    track_total_hits: true,
    size: DEFAULT_MAX_APM_EVENTS,
    sort: [{ '@timestamp': { order: 'asc' } }],
    _source: false,
    fields: DEFAULT_TRACE_FIELDS,
    query: {
      bool: {
        filter: [
          ...timeRangeFilter('@timestamp', { start, end }),
          ...termFilter('trace.id', traceId),
        ],
      },
    },
  });
}

export function getCorrelatedLogs({
  esClient,
  start,
  end,
  traceId,
  index,
}: {
  esClient: IScopedClusterClient;
  start: number;
  end: number;
  traceId: string;
  index: string[];
}) {
  const search = getTypedSearch(esClient.asCurrentUser);

  return search({
    index,
    track_total_hits: true,
    size: DEFAULT_MAX_LOG_EVENTS,
    sort: [{ '@timestamp': { order: 'asc' } }],
    _source: false,
    fields: DEFAULT_LOG_SOURCE_FIELDS,
    query: {
      bool: {
        filter: [
          ...timeRangeFilter('@timestamp', { start, end }),
          ...termFilter('trace.id', traceId),
        ],
      },
    },
  });
}

export async function getToolHandler({
  core,
  plugins,
  request,
  logger,
  esClient,
  start,
  end,
  traceId,
  index,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  request: KibanaRequest;
  logger: Logger;
  esClient: IScopedClusterClient;
  start: string;
  end: string;
  traceId: string;
  index?: string;
}) {
  const logsIndices = index?.split(',') ?? (await getLogsIndices({ core, logger }));
  const startTime = parseDatemath(start);
  const endTime = parseDatemath(end, { roundUp: true });

  const { apmEventClient } = await buildApmResources({ core, plugins, request, logger });

  const apmResponse = await getTraceDocs({
    apmEventClient,
    traceId,
    start: startTime,
    end: endTime,
  });
  const apmHits = apmResponse.hits.hits;

  const errorResponse = await getApmTraceError({
    apmEventClient,
    traceId,
    start: startTime,
    end: endTime,
  });

  const errorHits = errorResponse.hits.hits;

  const logsResponse = await getCorrelatedLogs({
    esClient,
    start: startTime,
    end: endTime,
    traceId,
    index: logsIndices,
  });
  const logHits = logsResponse?.hits.hits ?? [];

  const sequences: TraceSequence[] = [
    {
      traceId,
      traceItems: mapHitsToEntries(apmHits),
      errorItems: mapHitsToEntries(errorHits),
      logs: mapHitsToEntries(logHits),
    },
  ];

  return { sequences };
}

function mapHitsToEntries(
  apmHits: SearchHit<undefined, string[], undefined>[]
): { [k: string]: unknown }[] {
  return apmHits.map((hit) => {
    return Object.fromEntries(
      Object.entries(hit.fields ?? {}).map(([key, value]) => [
        key,
        Array.isArray(value) && value.length === 1 ? value[0] : value,
      ])
    );
  });
}
