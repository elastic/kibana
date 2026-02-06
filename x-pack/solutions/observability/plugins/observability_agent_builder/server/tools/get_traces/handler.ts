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
import { getObservabilityDataSources } from '../../utils/get_observability_data_sources';
import { parseDatemath } from '../../utils/time';
import { buildApmResources } from '../../utils/build_apm_resources';
import { timeRangeFilter, termFilter } from '../../utils/dsl_filters';
import { getTypedSearch } from '../../utils/get_typed_search';
import {
  DEFAULT_MAX_APM_EVENTS,
  DEFAULT_MAX_LOG_EVENTS,
  DEFAULT_LOG_SOURCE_FIELDS,
  DEFAULT_TRACE_FIELDS,
} from './constants';
import { getCorrelationIdentifiers } from './get_correlation_identifiers/get_correlation_identifiers';
import type { Correlation, TraceSequence } from './types';

export function getApmTraceError({
  apmEventClient,
  correlationIdentifier,
  startTime,
  endTime,
}: {
  apmEventClient: APMEventClient;
  correlationIdentifier: Correlation;
  startTime: number;
  endTime: number;
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
          ...timeRangeFilter('@timestamp', { start: startTime, end: endTime }),
          ...termFilter(correlationIdentifier.field, correlationIdentifier.value),
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
  correlationIdentifier,
  startTime,
  endTime,
}: {
  apmEventClient: APMEventClient;
  correlationIdentifier: Correlation;
  startTime: number;
  endTime: number;
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
          ...timeRangeFilter('@timestamp', { start: startTime, end: endTime }),
          ...termFilter(correlationIdentifier.field, correlationIdentifier.value),
        ],
      },
    },
  });
}

export function getCorrelatedLogs({
  esClient,
  correlationIdentifier,
  index,
  startTime,
  endTime,
}: {
  esClient: IScopedClusterClient;
  correlationIdentifier: Correlation;
  index: string[];
  startTime: number;
  endTime: number;
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
          ...timeRangeFilter('@timestamp', { start: startTime, end: endTime }),
          ...termFilter(correlationIdentifier.field, correlationIdentifier.value),
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
  index,
  kqlFilter,
  errorLogsOnly,
  maxSequences,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  request: KibanaRequest;
  logger: Logger;
  esClient: IScopedClusterClient;
  start: string;
  end: string;
  index?: string;
  kqlFilter?: string;
  errorLogsOnly: boolean;
  maxSequences: number;
}) {
  const dataSources = await getObservabilityDataSources({ core, plugins, logger });
  const logsIndices = index?.split(',') ?? dataSources.logIndexPatterns;

  const startTime = parseDatemath(start);
  const endTime = parseDatemath(end, { roundUp: true });
  const { apmEventClient } = await buildApmResources({ core, plugins, request, logger });

  const correlationIdentifiers = await getCorrelationIdentifiers({
    esClient,
    logsIndices,
    apmIndexPatterns: [
      dataSources.apmIndexPatterns.transaction,
      dataSources.apmIndexPatterns.span,
      dataSources.apmIndexPatterns.error,
    ],
    startTime,
    endTime,
    kqlFilter,
    errorLogsOnly,
    logger,
    maxSequences,
  });

  // For each correlation identifier, find the full distributed trace (transactions, spans, errors, and logs)
  const sequences: TraceSequence[] = await Promise.all(
    correlationIdentifiers.map(async (correlationIdentifier) => {
      const apmResponse = await getTraceDocs({
        apmEventClient,
        correlationIdentifier,
        startTime,
        endTime,
      });
      const apmHits = apmResponse.hits.hits;

      const errorResponse = await getApmTraceError({
        apmEventClient,
        correlationIdentifier,
        startTime,
        endTime,
      });

      const errorHits = errorResponse.hits.hits;

      const logsResponse = await getCorrelatedLogs({
        esClient,
        correlationIdentifier,
        index: logsIndices,
        startTime,
        endTime,
      });
      const logHits = logsResponse?.hits.hits ?? [];

      return {
        correlation_identifier: correlationIdentifier,
        traceItems: mapHitsToEntries(apmHits),
        errorItems: mapHitsToEntries(errorHits),
        logs: mapHitsToEntries(logHits),
      };
    })
  );

  return { sequences };
}

function mapHitsToEntries(
  hits: SearchHit<undefined, string[], undefined>[]
): Record<string, unknown>[] {
  return hits.map((hit) => {
    const entries = Object.fromEntries(
      Object.entries(hit.fields ?? {}).map(([key, value]) => [
        key,
        Array.isArray(value) && value.length === 1 ? value[0] : value,
      ])
    );
    return { _id: hit._id, ...entries };
  });
}
