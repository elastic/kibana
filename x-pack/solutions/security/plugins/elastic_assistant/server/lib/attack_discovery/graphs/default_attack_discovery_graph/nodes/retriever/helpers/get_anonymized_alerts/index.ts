/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  Replacements,
  getAnonymizedValue,
  getOpenAndAcknowledgedAlertsQuery,
  getRawDataOrDefault,
  sizeIsOutOfRange,
  transformRawData,
} from '@kbn/elastic-assistant-common';

import { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/bulk_crud_anonymization_fields_route.gen';
import { getAlertsCountQuery } from '@kbn/elastic-assistant-common/impl/alerts/get_open_and_acknowledged_alerts_query';

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
  end?: string | null;
  esClient: ElasticsearchClient;
  filter?: Record<string, unknown> | null;
  onNewReplacements?: (replacements: Replacements) => void;
  replacements?: Replacements;
  size?: number;
  start?: string | null;
}): Promise<{ anonymizedAlerts: string[]; unfilteredAlertsCount: number }> => {
  if (alertsIndexPattern == null || size == null || sizeIsOutOfRange(size)) {
    return { anonymizedAlerts: [], unfilteredAlertsCount: 0 };
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
  let count = 0;
  if (filter && Object.keys(filter).length) {
    const countQuery = getAlertsCountQuery({
      alertsIndexPattern,
      end,
      start,
    });
    count = (await esClient.count(countQuery)).count;
  }

  // Accumulate replacements locally so we can, for example use the same
  // replacement for a hostname when we see it in multiple alerts:
  let localReplacements = { ...(replacements ?? {}) };
  const localOnNewReplacements = (newReplacements: Replacements) => {
    localReplacements = { ...localReplacements, ...newReplacements };

    onNewReplacements?.(localReplacements); // invoke the callback with the latest replacements
  };

  return {
    anonymizedAlerts: result.hits?.hits?.map((x) =>
      transformRawData({
        anonymizationFields,
        currentReplacements: localReplacements, // <-- the latest local replacements
        getAnonymizedValue,
        onNewReplacements: localOnNewReplacements, // <-- the local callback
        rawData: getRawDataOrDefault(x.fields),
      })
    ),
    unfilteredAlertsCount: count,
  };
};
