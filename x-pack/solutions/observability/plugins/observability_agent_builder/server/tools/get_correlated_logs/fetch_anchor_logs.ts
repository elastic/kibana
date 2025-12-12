/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact, first, get, uniqBy } from 'lodash';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { SearchHit } from '@kbn/es-types';
import { getTypedSearch } from '../../utils/get_typed_search';
import { timeRangeFilter } from '../../utils/dsl_filters';
import { getShouldMatchOrNotExistFilter } from '../../utils/get_should_match_or_not_exist_filter';
import type { ErrorLogDoc, AnchorLog } from './types';
import { DEFAULT_ERROR_SEVERITY_FILTER } from './constants';

export async function fetchAnchorLogs({
  esClient,
  logsIndices,
  startTime,
  endTime,
  termsFilter,
  correlationFields,
  logger,
  logId,
}: {
  esClient: IScopedClusterClient;
  logsIndices: string[];
  startTime: number;
  endTime: number;
  termsFilter: Record<string, string> | undefined;
  correlationFields: string[];
  logger: Logger;
  logId?: string;
}): Promise<AnchorLog[]> {
  if (logId) {
    const anchor = await fetchAnchorLog({
      esClient,
      logsIndices,
      logId,
      correlationFields,
      logger,
    });
    return anchor ? [anchor] : [];
  }

  const search = getTypedSearch(esClient.asCurrentUser);
  const correlationIdentifierFields = correlationFields;

  const anchorLogsResponse = await search<ErrorLogDoc, any>({
    size: 50,
    track_total_hits: false,
    _source: false,
    fields: ['@timestamp', ...correlationIdentifierFields],
    index: logsIndices,
    sort: [{ '@timestamp': { order: 'desc' } }],
    query: {
      bool: {
        filter: [
          ...timeRangeFilter('@timestamp', { start: startTime, end: endTime }),
          ...getShouldMatchOrNotExistFilter(termsFilter),

          // must have at least one correlation identifier
          {
            bool: {
              should: correlationIdentifierFields.map((field) => ({ exists: { field } })),
              minimum_should_match: 1,
            },
          },

          // must be an error
          DEFAULT_ERROR_SEVERITY_FILTER, // this could be exposed as a tool parameter in the future
        ],
      },
    },
  });

  const errorAnchors: AnchorLog[] = uniqBy(
    compact(
      anchorLogsResponse.hits.hits.map((hit) =>
        findCorrelationIdentifier(hit, correlationIdentifierFields)
      )
    ),
    ({ correlation }) => correlation.value
  );

  logger.debug(
    `Found ${anchorLogsResponse.hits.hits.length} anchor logs in ${errorAnchors.length} unique sequences`
  );

  return errorAnchors.slice(0, 10); // limit to 10 anchors
}

async function fetchAnchorLog({
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
  const response = await search<ErrorLogDoc, any>({
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

  return findCorrelationIdentifier(hit, correlationFields);
}

export function findCorrelationIdentifier(
  hit: SearchHit<ErrorLogDoc | undefined, any, any>,
  correlationFields: string[]
): AnchorLog | undefined {
  if (!hit) return undefined;

  const correlationIdentifier = correlationFields
    .map((correlationField) => {
      const timestamp = first(hit.fields?.['@timestamp']) as string;
      const value = first(get(hit.fields, correlationField)) as string;

      return {
        '@timestamp': timestamp,
        correlation: {
          field: correlationField,
          value,
        },
      };
    })
    .find(({ correlation }) => correlation.value != null);

  return correlationIdentifier;
}
