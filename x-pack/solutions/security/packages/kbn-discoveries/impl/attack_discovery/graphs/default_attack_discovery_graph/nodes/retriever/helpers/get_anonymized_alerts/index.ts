/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DateMath, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Replacements } from '@kbn/elastic-assistant-common';
import {
  getAnonymizedValue,
  getOpenAndAcknowledgedAlertsQuery,
  getRawDataOrDefault,
  sizeIsOutOfRange,
  transformRawData,
} from '@kbn/elastic-assistant-common';

import type { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas';

export const getAnonymizedAlerts = async ({
  alertsIndexPattern,
  anonymizationFields,
  end,
  esClient,
  filter,
  onNewReplacements,
  replacements,
  size,
  start,
}: {
  alertsIndexPattern?: string;
  anonymizationFields?: AnonymizationFieldResponse[];
  end?: DateMath | null;
  esClient: ElasticsearchClient;
  filter?: Record<string, unknown> | null;
  onNewReplacements?: (replacements: Replacements) => void;
  replacements?: Replacements;
  size?: number;
  start?: DateMath | null;
}): Promise<string[]> => {
  // Exact-id re-fetch (skill mode): when the caller passes an `ids` filter it has
  // already selected the precise documents to fetch (the gate-curated alerts). The
  // shared builder unconditionally ANDs an open/acknowledged status clause and a
  // `@timestamp` range (defaulting to now-24h) onto every query, which would drop
  // curated alerts that are older than that window or not open/acknowledged. Override
  // just the query clause with a plain `ids` query so those documents resolve exactly,
  // regardless of age or status. The rest of the request (index/fields/_source/sort)
  // is preserved so anonymization is unchanged. Only the id re-fetch passes an `ids`
  // filter, so no other retrieval path is affected.
  const rawIds =
    filter != null && typeof filter === 'object' && 'ids' in filter
      ? (filter as Record<string, unknown>).ids
      : undefined;
  const idsValues =
    rawIds != null &&
    typeof rawIds === 'object' &&
    'values' in rawIds &&
    Array.isArray((rawIds as { values?: unknown }).values)
      ? (rawIds as { values: string[] }).values
      : undefined;

  // An exact-id fetch is sized by its ids. The 10 to 10,000 range validates the
  // user's "max alerts" setting, not a curated id set, which may hold fewer than 10.
  const searchSize = idsValues != null ? idsValues.length : size;

  if (
    alertsIndexPattern == null ||
    searchSize == null ||
    searchSize === 0 ||
    (idsValues == null && sizeIsOutOfRange(searchSize))
  ) {
    return [];
  }

  const query = getOpenAndAcknowledgedAlertsQuery({
    alertsIndexPattern,
    anonymizationFields: anonymizationFields ?? [],
    end,
    filter,
    size: searchSize,
    start,
  });

  const searchRequest =
    idsValues != null ? { ...query, query: { ids: { values: idsValues } } } : query;

  const result = await esClient.search<SearchResponse>(searchRequest);

  // Accumulate replacements locally so we can, for example use the same
  // replacement for a hostname when we see it in multiple alerts:
  let localReplacements = { ...(replacements ?? {}) };
  const localOnNewReplacements = (newReplacements: Replacements) => {
    localReplacements = { ...localReplacements, ...newReplacements };

    onNewReplacements?.(localReplacements); // invoke the callback with the latest replacements
  };

  return result.hits?.hits?.map((x) =>
    transformRawData({
      anonymizationFields,
      currentReplacements: localReplacements, // <-- the latest local replacements
      getAnonymizedValue,
      onNewReplacements: localOnNewReplacements, // <-- the local callback
      rawData: getRawDataOrDefault(x.fields),
    })
  );
};
