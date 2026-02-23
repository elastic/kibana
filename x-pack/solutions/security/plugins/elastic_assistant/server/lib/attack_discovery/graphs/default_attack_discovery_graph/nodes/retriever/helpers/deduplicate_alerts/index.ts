/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsTermsAggregateBase,
  AggregationsTermsBucketBase,
  AggregationsTopHitsAggregate,
  AggregationsMaxAggregate,
  DateMath,
  SearchHit,
  SearchResponse,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas';
import { getOpenAndAcknowledgedAlertsQuery } from '@kbn/elastic-assistant-common';

import type {
  DeduplicationConfig,
  DeduplicationResult,
  AlertGroup,
  CorrelationField,
} from './types';
import { DEFAULT_DEDUPLICATION_CONFIG } from './types';
import { getDeduplicationAggQuery } from './get_deduplication_agg_query';

/** Extended bucket type with our custom aggregations */
interface AlertGroupBucket extends AggregationsTermsBucketBase {
  key: string;
  doc_count: number;
  max_risk_score: AggregationsMaxAggregate;
  top_alert: AggregationsTopHitsAggregate;
  alert_ids: AggregationsTermsAggregateBase<{ key: string; doc_count: number }>;
  [key: `field_${string}`]: AggregationsTermsAggregateBase<{ key: string; doc_count: number }>;
}

/** Response type for the aggregation query */
interface DeduplicationAggregationResponse {
  alert_groups: AggregationsTermsAggregateBase<AlertGroupBucket>;
}

/**
 * Parses the ES aggregation response into AlertGroup objects
 */
const parseAggregationResponse = (
  response: SearchResponse<unknown>,
  config: DeduplicationConfig
): AlertGroup[] => {
  const aggregations = response.aggregations as DeduplicationAggregationResponse | undefined;

  if (!aggregations?.alert_groups?.buckets) {
    return [];
  }

  const buckets = aggregations.alert_groups.buckets;

  if (!Array.isArray(buckets)) {
    return [];
  }

  return buckets.map((bucket) => {
    const topHits = bucket.top_alert?.hits?.hits ?? [];
    const representativeAlert = topHits[0] as SearchHit;

    // Extract correlation field values
    const correlationValues: Record<string, string | undefined> = {};
    for (const field of config.correlationFields) {
      const fieldKey = `field_${field.replace(/\./g, '_')}`;
      const fieldAgg = bucket[fieldKey as `field_${string}`];
      if (fieldAgg?.buckets && Array.isArray(fieldAgg.buckets) && fieldAgg.buckets.length > 0) {
        correlationValues[field] = fieldAgg.buckets[0].key;
      }
    }

    // Collect alert IDs
    const alertIdBuckets = bucket.alert_ids?.buckets;
    const alertIds = Array.isArray(alertIdBuckets)
      ? alertIdBuckets.map((idBucket) => idBucket.key)
      : [];

    return {
      correlationKey: bucket.key,
      representativeAlert,
      totalCount: bucket.doc_count,
      alertIds,
      correlationValues,
    };
  });
};

/**
 * Calculates deduplication statistics
 */
const calculateStats = (
  alertGroups: AlertGroup[],
  totalOriginalAlerts: number
): DeduplicationResult['stats'] => {
  const uniqueGroupCount = alertGroups.length;
  const duplicatesRemoved = totalOriginalAlerts - uniqueGroupCount;
  const reductionPercentage =
    totalOriginalAlerts > 0 ? (duplicatesRemoved / totalOriginalAlerts) * 100 : 0;
  const avgDuplicatesPerGroup = uniqueGroupCount > 0 ? totalOriginalAlerts / uniqueGroupCount : 0;

  return {
    duplicatesRemoved,
    reductionPercentage: Math.round(reductionPercentage * 100) / 100,
    avgDuplicatesPerGroup: Math.round(avgDuplicatesPerGroup * 100) / 100,
  };
};

export interface DeduplicateAlertsParams {
  alertsIndexPattern: string;
  anonymizationFields?: AnonymizationFieldResponse[];
  config?: DeduplicationConfig;
  end?: DateMath | null;
  esClient: ElasticsearchClient;
  filter?: Record<string, unknown> | null;
  size: number;
  start?: DateMath | null;
}

/**
 * Deduplicates alerts using ES aggregations to group correlated alerts.
 * Returns representative alerts for each group along with metadata.
 */
export const deduplicateAlerts = async ({
  alertsIndexPattern,
  anonymizationFields,
  config = DEFAULT_DEDUPLICATION_CONFIG,
  end,
  esClient,
  filter,
  size,
  start,
}: DeduplicateAlertsParams): Promise<DeduplicationResult> => {
  // Build the base query for open and acknowledged alerts
  const baseQuery = getOpenAndAcknowledgedAlertsQuery({
    alertsIndexPattern,
    anonymizationFields: anonymizationFields ?? [],
    end,
    filter,
    size: 0, // We don't need hits, only aggregations
    start,
  });

  // Add deduplication aggregation
  const deduplicationAgg = getDeduplicationAggQuery(config);

  const searchRequest = {
    ...baseQuery,
    size: 0, // Only aggregations, no top-level hits
    aggs: {
      alert_groups: deduplicationAgg,
      total_alerts: {
        value_count: {
          field: '_id',
        },
      },
    },
  };

  const response = await esClient.search<SearchResponse>(searchRequest);

  // Get total alerts count
  const totalAlertsAgg = response.aggregations?.total_alerts as { value: number } | undefined;
  const totalOriginalAlerts = totalAlertsAgg?.value ?? 0;

  // Parse alert groups from aggregation response
  const alertGroups = parseAggregationResponse(response, config);

  // Calculate statistics
  const stats = calculateStats(alertGroups, totalOriginalAlerts);

  return {
    alertGroups,
    totalOriginalAlerts,
    uniqueGroupCount: alertGroups.length,
    stats,
  };
};

/**
 * Gets deduplicated alerts as SearchHit objects for further processing.
 * This is the main integration point for the existing alert retrieval flow.
 */
export const getDeduplicatedAlertHits = async (
  params: DeduplicateAlertsParams
): Promise<{
  hits: SearchHit[];
  deduplicationStats: DeduplicationResult['stats'];
  totalOriginalAlerts: number;
}> => {
  const result = await deduplicateAlerts(params);

  // Extract representative alert hits
  const hits = result.alertGroups
    .filter((group) => group.representativeAlert != null)
    .map((group) => group.representativeAlert);

  return {
    hits,
    deduplicationStats: result.stats,
    totalOriginalAlerts: result.totalOriginalAlerts,
  };
};

/**
 * Creates a mapping from representative alert IDs to all correlated alert IDs.
 * Useful for preserving references to all original alerts in attack discoveries.
 */
export const getAlertIdCorrelationMap = async (
  params: DeduplicateAlertsParams
): Promise<Map<string, string[]>> => {
  const result = await deduplicateAlerts(params);

  const correlationMap = new Map<string, string[]>();

  for (const group of result.alertGroups) {
    if (group.representativeAlert?._id) {
      correlationMap.set(group.representativeAlert._id, group.alertIds);
    }
  }

  return correlationMap;
};

// Re-export types and utilities
export type { DeduplicationConfig, DeduplicationResult, AlertGroup, CorrelationField };
export { DEFAULT_DEDUPLICATION_CONFIG, CORRELATION_FIELDS } from './types';
export {
  getDeduplicationAggQuery,
  DEDUPLICATION_PRESETS,
  type DeduplicationPreset,
} from './get_deduplication_agg_query';
