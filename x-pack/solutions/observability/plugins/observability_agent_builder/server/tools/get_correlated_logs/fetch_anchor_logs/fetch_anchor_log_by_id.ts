/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { first, get } from 'lodash';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import { getTypedSearch } from '../../../utils/get_typed_search';
import type { AnchorLog } from '../types';

export async function getAnchorLogById({
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

function getAnchorLogFromHit(hit: SearchHit, correlationFields: string[]): AnchorLog | undefined {
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
