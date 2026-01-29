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
  type TraceSequence,
} from './constants';

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

  const apmResponse = await apmEventClient.search('observability_agent_builder_get_trace_docs', {
    apm: {
      events: [ProcessorEvent.transaction, ProcessorEvent.span, ProcessorEvent.error],
    },
    track_total_hits: true,
    size: DEFAULT_MAX_APM_EVENTS,
    sort: [{ '@timestamp': { order: 'asc' } }],
    _source: false,
    fields: [
      '@timestamp',
      'trace.id',
      'processor.event',
      'service.name',
      'service.environment',
      'event.outcome',
      'transaction.id',
      'transaction.name',
      'transaction.duration.us',
      'span.id',
      'span.name',
      'span.type',
      'span.subtype',
      'span.duration.us',
      'parent.id',
      'error.message',
      'error.type',
      'message',
    ],
    query: {
      bool: {
        filter: [
          ...timeRangeFilter('@timestamp', { start: startTime, end: endTime }),
          ...termFilter('trace.id', traceId),
        ],
      },
    },
  });

  const apmHits = apmResponse.hits.hits;

  const search = getTypedSearch(esClient.asCurrentUser);

  const shouldSearchLogs = logsIndices.length > 0;
  const logsResponse = shouldSearchLogs
    ? await search({
        index: logsIndices,
        track_total_hits: true,
        size: DEFAULT_MAX_LOG_EVENTS,
        sort: [{ '@timestamp': { order: 'asc' } }],
        _source: false,
        fields: DEFAULT_LOG_SOURCE_FIELDS,
        query: {
          bool: {
            filter: [
              ...timeRangeFilter('@timestamp', { start: startTime, end: endTime }),
              ...termFilter('trace.id', traceId),
            ],
          },
        },
      })
    : undefined;

  const logHits = logsResponse?.hits.hits ?? [];

  const sequences: TraceSequence[] = [
    {
      traceId,
      traceItems: mapHitsToEntries(apmHits),
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
