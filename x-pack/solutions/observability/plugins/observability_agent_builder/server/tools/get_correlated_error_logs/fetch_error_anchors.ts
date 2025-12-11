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
import { DEFAULT_CORRELATION_IDENTIFIER_FIELDS, DEFAULT_ERROR_SEVERITY_FILTER } from './constants';
import type { ErrorLogDoc, ErrorAnchor } from './types';

export async function fetchErrorAnchors({
  esClient,
  logsIndices,
  startTime,
  endTime,
  terms,
  errorSeverityFilter,
  correlationFields,
  logger,
}: {
  esClient: IScopedClusterClient;
  logsIndices: string[];
  startTime: number;
  endTime: number;
  terms: Record<string, string> | undefined;
  errorSeverityFilter: Record<string, any> | undefined;
  correlationFields: string[] | undefined;
  logger: Logger;
}): Promise<ErrorAnchor[]> {
  const search = getTypedSearch(esClient.asCurrentUser);
  const correlationIdentifierFields = correlationFields ?? DEFAULT_CORRELATION_IDENTIFIER_FIELDS;

  const errorLogsResponse = await search<ErrorLogDoc, any>({
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
          ...getShouldMatchOrNotExistFilter(terms),

          // must have at least one correlation identifier
          {
            bool: {
              should: correlationIdentifierFields.map((field) => ({ exists: { field } })),
              minimum_should_match: 1,
            },
          },

          // must be an error
          errorSeverityFilter ?? DEFAULT_ERROR_SEVERITY_FILTER,
        ],
      },
    },
  });

  const errorAnchors: ErrorAnchor[] = uniqBy(
    compact(
      errorLogsResponse.hits.hits.map((hit) =>
        findCorrelationIdentifier(hit, correlationIdentifierFields)
      )
    ),
    ({ correlation }) => correlation.value
  );

  logger.debug(
    `Found ${errorLogsResponse.hits.hits.length} error logs in ${errorAnchors.length} unique sequences`
  );

  return errorAnchors.slice(0, 10); // limit to 10 anchors
}

function findCorrelationIdentifier(
  hit: SearchHit<ErrorLogDoc | undefined, any, any>,
  fields: string[]
): ErrorAnchor | undefined {
  if (!hit) return undefined;

  const correlationIdentifier = fields
    .map((correlationField) => ({
      '@timestamp': first(hit?.fields?.['@timestamp']) as string,
      correlation: {
        field: correlationField,
        value: first(get(hit.fields, correlationField)) as string,
      },
    }))
    .find(({ correlation }) => correlation.value != null);

  return correlationIdentifier;
}
