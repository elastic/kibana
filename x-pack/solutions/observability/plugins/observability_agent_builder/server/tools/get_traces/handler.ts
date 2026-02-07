/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/core/server';
import type { SearchHit } from '@kbn/es-types';
import type {
  ObservabilityAgentBuilderCoreSetup,
  ObservabilityAgentBuilderPluginSetupDependencies,
} from '../../types';
import { getObservabilityDataSources } from '../../utils/get_observability_data_sources';
import { parseDatemath } from '../../utils/time';
import { timeRangeFilter, termFilter } from '../../utils/dsl_filters';
import { getTypedSearch } from '../../utils/get_typed_search';
import { unwrapEsFields } from '../../utils/unwrap_es_fields';
import {
  DEFAULT_MAX_APM_EVENTS,
  DEFAULT_MAX_LOG_EVENTS,
  DEFAULT_LOG_SOURCE_FIELDS,
  DEFAULT_TRACE_FIELDS,
} from './constants';
import { getCorrelationIdentifiers } from './get_correlation_identifiers/get_correlation_identifiers';
import type { Correlation, TraceSequence } from './types';

export async function getDocuments({
  esClient,
  correlationIdentifier,
  index,
  startTime,
  endTime,
  size,
  fields,
}: {
  esClient: IScopedClusterClient;
  correlationIdentifier: Correlation;
  index: string[];
  startTime: number;
  endTime: number;
  size: number;
  fields: string[];
}) {
  const search = getTypedSearch(esClient.asCurrentUser);

  const searchResult = await search({
    index,
    track_total_hits: true,
    size,
    sort: [{ '@timestamp': { order: 'asc' } }],
    _source: false,
    fields,
    query: {
      bool: {
        filter: [
          ...timeRangeFilter('@timestamp', { start: startTime, end: endTime }),
          ...termFilter(correlationIdentifier.field, correlationIdentifier.value),
        ],
      },
    },
  });
  return searchResult.hits.hits;
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
  maxSequences,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  logger: Logger;
  esClient: IScopedClusterClient;
  start: string;
  end: string;
  index?: string;
  kqlFilter?: string;
  maxSequences: number;
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

  const correlationIdentifiers = await getCorrelationIdentifiers({
    esClient,
    indices,
    startTime,
    endTime,
    kqlFilter,
    logger,
    maxSequences,
  });

  // For each correlation identifier, find the full distributed trace (transactions, spans, errors, and logs)
  const sequences: TraceSequence[] = await Promise.all(
    correlationIdentifiers.map(async (correlationIdentifier) => {
      const apmHits = await getDocuments({
        esClient,
        correlationIdentifier,
        index: apmIndexPatterns,
        startTime,
        endTime,
        size: DEFAULT_MAX_APM_EVENTS,
        fields: DEFAULT_TRACE_FIELDS,
      });

      const logHits = await getDocuments({
        esClient,
        correlationIdentifier,
        index: dataSources.logIndexPatterns,
        startTime,
        endTime,
        size: DEFAULT_MAX_LOG_EVENTS,
        fields: DEFAULT_LOG_SOURCE_FIELDS,
      });

      return {
        correlation_identifier: correlationIdentifier,
        traceItems: mapHitsToEntries(apmHits),
        logs: mapHitsToEntries(logHits),
      };
    })
  );

  return { sequences };
}

function mapHitsToEntries(
  hits: SearchHit<undefined, string[], undefined>[]
): Record<string, unknown>[] {
  return hits.map((hit) => ({ _id: hit._id, ...unwrapEsFields(hit.fields) }));
}
