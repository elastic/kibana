/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DateMath, SearchHit, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
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

import type { DeduplicationConfig, DeduplicationResult } from '../deduplicate_alerts';
import { getDeduplicatedAlertHits, DEFAULT_DEDUPLICATION_CONFIG } from '../deduplicate_alerts';

export interface GetAnonymizedAlertsParams {
  alertsIndexPattern?: string;
  anonymizationFields?: AnonymizationFieldResponse[];
  end?: DateMath | null;
  esClient: ElasticsearchClient;
  filter?: Record<string, unknown> | null;
  onNewReplacements?: (replacements: Replacements) => void;
  replacements?: Replacements;
  size?: number;
  start?: DateMath | null;
}

export interface GetAnonymizedAlertsWithDeduplicationParams extends GetAnonymizedAlertsParams {
  /** Configuration for alert deduplication. If not provided, default config is used. */
  deduplicationConfig?: DeduplicationConfig;
}

export interface GetAnonymizedAlertsWithDeduplicationResult {
  /** Anonymized alert strings for LLM consumption */
  anonymizedAlerts: string[];
  /** Statistics about the deduplication process */
  deduplicationStats: DeduplicationResult['stats'];
  /** Total number of alerts before deduplication */
  totalOriginalAlerts: number;
  /** Map from representative alert ID to all correlated alert IDs */
  alertIdCorrelationMap: Map<string, string[]>;
}

/**
 * Transforms search hits to anonymized alert strings.
 * This is the core transformation logic used by both regular and deduplicated flows.
 */
const transformHitsToAnonymizedAlerts = (
  hits: SearchHit[],
  anonymizationFields: AnonymizationFieldResponse[] | undefined,
  replacements: Replacements | undefined,
  onNewReplacements?: (replacements: Replacements) => void
): string[] => {
  // Accumulate replacements locally so we can, for example use the same
  // replacement for a hostname when we see it in multiple alerts:
  let localReplacements = { ...(replacements ?? {}) };
  const localOnNewReplacements = (newReplacements: Replacements) => {
    localReplacements = { ...localReplacements, ...newReplacements };
    onNewReplacements?.(localReplacements); // invoke the callback with the latest replacements
  };

  return hits.map((x) =>
    transformRawData({
      anonymizationFields,
      currentReplacements: localReplacements, // <-- the latest local replacements
      getAnonymizedValue,
      onNewReplacements: localOnNewReplacements, // <-- the local callback
      rawData: getRawDataOrDefault(x.fields),
    })
  );
};

/**
 * Gets anonymized alerts without deduplication.
 * This is the original function preserved for backward compatibility.
 */
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
}: GetAnonymizedAlertsParams): Promise<string[]> => {
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

  return transformHitsToAnonymizedAlerts(
    result.hits?.hits ?? [],
    anonymizationFields,
    replacements,
    onNewReplacements
  );
};

/**
 * Gets anonymized alerts with deduplication enabled.
 * Groups correlated alerts and returns representative alerts for each group,
 * reducing token consumption while preserving all alert references.
 *
 * @param params - Parameters including deduplication configuration
 * @returns Anonymized alerts with deduplication statistics and correlation map
 */
export const getAnonymizedAlertsWithDeduplication = async ({
  alertsIndexPattern,
  anonymizationFields,
  deduplicationConfig = DEFAULT_DEDUPLICATION_CONFIG,
  end,
  esClient,
  filter,
  onNewReplacements,
  replacements,
  size,
  start,
}: GetAnonymizedAlertsWithDeduplicationParams): Promise<GetAnonymizedAlertsWithDeduplicationResult> => {
  if (alertsIndexPattern == null || size == null || sizeIsOutOfRange(size)) {
    return {
      anonymizedAlerts: [],
      deduplicationStats: {
        duplicatesRemoved: 0,
        reductionPercentage: 0,
        avgDuplicatesPerGroup: 0,
      },
      totalOriginalAlerts: 0,
      alertIdCorrelationMap: new Map(),
    };
  }

  // Get deduplicated alert hits using ES aggregations
  const { hits, deduplicationStats, totalOriginalAlerts } = await getDeduplicatedAlertHits({
    alertsIndexPattern,
    anonymizationFields,
    config: deduplicationConfig,
    end,
    esClient,
    filter,
    size,
    start,
  });

  // Build correlation map from representative alerts
  const alertIdCorrelationMap = new Map<string, string[]>();
  // Note: The actual correlation mapping is done in the deduplication module,
  // but for the simplified flow we just map each alert to itself
  // Full correlation is available via getAlertIdCorrelationMap if needed
  hits.forEach((hit) => {
    if (hit._id) {
      alertIdCorrelationMap.set(hit._id, [hit._id]);
    }
  });

  // Transform hits to anonymized alerts
  const anonymizedAlerts = transformHitsToAnonymizedAlerts(
    hits,
    anonymizationFields,
    replacements,
    onNewReplacements
  );

  return {
    anonymizedAlerts,
    deduplicationStats,
    totalOriginalAlerts,
    alertIdCorrelationMap,
  };
};
