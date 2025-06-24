/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DateMath, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  Replacements,
  getAnonymizedValue,
  getOpenAndAcknowledgedAlertsQuery,
  getRawDataOrDefault,
  sizeIsOutOfRange,
  transformRawData,
} from '@kbn/elastic-assistant-common';

import { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas';

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
  if (alertsIndexPattern == null || size == null || sizeIsOutOfRange(size)) {
    return [];
  }

  const query = getOpenAndAcknowledgedAlertsQuery({
    alertsIndexPattern,
    anonymizationFields: anonymizationFields ?? [],
    end,
    filter,
    size,
    start,
  });

  const result = await esClient.search<SearchResponse>(query);

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
