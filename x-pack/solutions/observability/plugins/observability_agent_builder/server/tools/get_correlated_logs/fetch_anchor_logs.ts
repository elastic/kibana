/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact, first, get, uniqBy } from 'lodash';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { getTypedSearch } from '../../utils/get_typed_search';
import { kqlFilter, timeRangeFilter } from '../../utils/dsl_filters';
import type { AnchorLog } from './types';
import { DEFAULT_ERROR_SEVERITY_FILTER } from './constants';

export async function fetchAnchorLogs({
  esClient,
  logsIndices,
  startTime,
  endTime,
  logsKqlFilter,
  anchorKqlFilter,
  correlationFields,
  logger,
  logId,
  maxSequences,
}: {
  esClient: IScopedClusterClient;
  logsIndices: string[];
  startTime: number;
  endTime: number;
  logsKqlFilter: string | undefined;
  anchorKqlFilter: string | undefined;
  correlationFields: string[];
  logger: Logger;
  logId?: string;
  maxSequences: number;
}): Promise<AnchorLog[]> {
  if (logId) {
    const anchor = await fetchAnchorLogById({
      esClient,
      logsIndices,
      logId,
      correlationFields,
      logger,
    });
    return anchor ? [anchor] : [];
  }

  const correlationIdentifierFields = correlationFields;

  const anchorLogsResponse = await esClient.asCurrentUser.search({
    size: Math.max(50, maxSequences * 5), // Fetch more than needed to account for duplicate anchor logs for the same correlation id
    track_total_hits: false,
    _source: false,
    fields: ['@timestamp', ...correlationIdentifierFields],
    index: logsIndices,
    sort: [{ '@timestamp': { order: 'desc' } }],
    query: {
      bool: {
        filter: [
          ...timeRangeFilter('@timestamp', { start: startTime, end: endTime }),
          ...kqlFilter(logsKqlFilter),

          // must have at least one correlation identifier
          {
            bool: {
              should: correlationIdentifierFields.map((field) => ({ exists: { field } })),
              minimum_should_match: 1,
            },
          },

          // must be an error (or match the provided anchor filter)
          ...(anchorKqlFilter ? kqlFilter(anchorKqlFilter) : [DEFAULT_ERROR_SEVERITY_FILTER]),
        ],
      },
    },
  });

  // Limit to a single anchor log per correlation identifier
  const anchorLogs: AnchorLog[] = uniqBy(
    compact(
      anchorLogsResponse.hits.hits.map((hit) =>
        getAnchorLogFromHit(hit, correlationIdentifierFields)
      )
    ),
    ({ correlation }) => correlation.value
  );

  logger.debug(
    `Found ${anchorLogsResponse.hits.hits.length} anchor logs in ${anchorLogs.length} unique sequences`
  );

  return anchorLogs.slice(0, maxSequences);
}

async function fetchAnchorLogById({
  esClient,
  logsIndices,
  logId,
  correlationFields,
  logger,
}: {
  esClient: IScopedClusterClient;
  logsIndices: string[];
  logId: string;
  correlationFields: string[];
  logger: Logger;
}): Promise<AnchorLog | undefined> {
  const search = getTypedSearch(esClient.asCurrentUser);
  const response = await search({
    size: 1,
    track_total_hits: false,
    _source: false,
    fields: ['@timestamp', ...correlationFields],
    index: logsIndices,
    query: { ids: { values: [logId] } },
  });

  const hit = first(response.hits.hits);

  if (!hit) {
    logger.warn(`Log with ID ${logId} not found in indices: ${logsIndices.join(', ')}`);
    return undefined;
  }

  return getAnchorLogFromHit(hit, correlationFields);
}

export function getAnchorLogFromHit(
  hit: SearchHit,
  correlationFields: string[]
): AnchorLog | undefined {
  if (!hit) return undefined;

  const correlationIdentifier = correlationFields
    .map((correlationField) => {
      const timestamp = first(hit.fields?.['@timestamp']) as string;
      const value = first(get(hit.fields, correlationField)) as string;
      const anchorLogId = hit._id as string;

      return {
        '@timestamp': timestamp,
        correlation: { field: correlationField, value, anchorLogId },
      };
    })
    .find(({ correlation }) => correlation.value != null);

  return correlationIdentifier;
}
