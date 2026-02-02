/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
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
} from './constants';
import { getAnchorLogs } from './fetch_anchor_logs/fetch_anchor_logs';
import type { Correlation, TraceSequence } from './types';

export function getApmTraceError({
  apmEventClient,
  correlationIdentifier,
}: {
  apmEventClient: APMEventClient;
  correlationIdentifier: Correlation;
}) {
  const { identifier, start, end } = correlationIdentifier;
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
          ...termFilter(identifier.field, identifier.value),
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
}: {
  apmEventClient: APMEventClient;
  correlationIdentifier: Correlation;
}) {
  const { identifier, start, end } = correlationIdentifier;
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
          ...termFilter(identifier.field, identifier.value),
        ],
      },
    },
  });
}

export function getCorrelatedLogs({
  esClient,
  correlationIdentifier,
  index,
}: {
  esClient: IScopedClusterClient;
  correlationIdentifier: Correlation;
  index: string[];
}) {
  const { identifier, start, end } = correlationIdentifier;
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
          ...termFilter(identifier.field, identifier.value),
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
  kqlFilter,
  errorLogsOnly,
  logId,
  maxSequences,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  request: KibanaRequest;
  logger: Logger;
  esClient: IScopedClusterClient;
  start: string;
  end: string;
  traceId?: string;
  index?: string;
  kqlFilter?: string;
  errorLogsOnly: boolean;
  logId?: string;
  maxSequences: number;
}) {
  const logsIndices = index?.split(',') ?? (await getLogsIndices({ core, logger }));
  const startTime = parseDatemath(start);
  const endTime = parseDatemath(end, { roundUp: true });
  let correlationIdentifiers: Correlation[] = [];
  if (traceId) {
    correlationIdentifiers = [
      {
        start: startTime,
        end: endTime,
        identifier: { field: 'trace.id', value: traceId },
      },
    ];
  } else {
    const anchorLogs = await getAnchorLogs({
      esClient,
      logsIndices,
      startTime,
      endTime,
      kqlFilter,
      errorLogsOnly,
      logger,
      logId,
      maxSequences,
    });
    correlationIdentifiers = anchorLogs.map((anchorLog) => {
      const { correlation, '@timestamp': timestamp } = anchorLog;
      return {
        identifier: {
          field: correlation.field,
          value: correlation.value,
        },
        start: moment(timestamp).subtract(1, 'hour').valueOf(),
        end: moment(timestamp).add(1, 'hour').valueOf(),
      };
    });
  }
  const { apmEventClient } = await buildApmResources({ core, plugins, request, logger });

  // For each correlation identifier, find the full distributed trace (transactions, spans, errors, and logs)
  const sequences: TraceSequence[] = await Promise.all(
    correlationIdentifiers.map(async (correlationIdentifier) => {
      const apmResponse = await getTraceDocs({
        apmEventClient,
        correlationIdentifier,
      });
      const apmHits = apmResponse.hits.hits;

      const errorResponse = await getApmTraceError({
        apmEventClient,
        correlationIdentifier,
      });

      const errorHits = errorResponse.hits.hits;

      const logsResponse = await getCorrelatedLogs({
        esClient,
        correlationIdentifier,
        index: logsIndices,
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
