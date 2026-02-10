/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/core/server';
import type {
  ObservabilityAgentBuilderCoreSetup,
  ObservabilityAgentBuilderPluginSetupDependencies,
} from '../../types';
import { getObservabilityDataSources } from '../../utils/get_observability_data_sources';
import { parseDatemath } from '../../utils/time';
import { timeRangeFilter, termFilter } from '../../utils/dsl_filters';
import { getTypedSearch } from '../../utils/get_typed_search';
import { unwrapEsFields } from '../../utils/unwrap_es_fields';
import { getCorrelationIdentifiers } from './get_correlation_identifiers/get_correlation_identifiers';
import type { Correlation, TraceSequence } from './types';
import { getTotalHits } from '../../utils/get_total_hits';

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
  correlationIdentifier: Correlation['identifier'];
  index: string[];
  startTime: number;
  endTime: number;
  size: number;
  fields: string[];
}) {
  const search = getTypedSearch(esClient.asCurrentUser);

  const searchResult = await search({
    index,
    track_total_hits: size + 1, // +1 to determine if results are truncated
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
  return {
    traces: searchResult.hits.hits.map((hit) => unwrapEsFields(hit.fields)),
    isTruncated: getTotalHits(searchResult) > size,
  };
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
  maxTraceSize,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  logger: Logger;
  esClient: IScopedClusterClient;
  start: string;
  end: string;
  index?: string;
  kqlFilter?: string;
  fields: string[];
  maxTraces: number;
  maxTraceSize: number;
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
    maxTraceSize,
  });

  // For each correlation identifier, find the full distributed trace (transactions, spans, errors, and logs)
  const sequences: TraceSequence[] = await Promise.all(
    correlationIdentifiers.map(async (correlation) => {
      return await getDocuments({
        esClient,
        correlationIdentifier: correlation.identifier,
        index: indices,
        startTime: correlation.start,
        endTime: correlation.end,
        size: maxTraces,
        fields,
      });
    })
  );

  return { sequences };
}
