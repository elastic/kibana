/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsAggregationContainer,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';

import type { DeduplicationConfig, CorrelationField } from './types';
import { DEFAULT_DEDUPLICATION_CONFIG, CORRELATION_FIELDS } from './types';

/**
 * Builds a composite aggregation key for grouping alerts by correlation fields.
 * Uses a script to concatenate field values, handling missing fields gracefully.
 */
const buildCorrelationKeyScript = (fields: CorrelationField[]): string => {
  const fieldAccessors = fields.map((field) => {
    // Handle nested field access (e.g., 'file.hash.sha256')
    const fieldParts = field.split('.');
    let accessor = 'doc';
    for (const part of fieldParts) {
      accessor = `${accessor}['${part}']`;
    }
    return `(${accessor}.size() > 0 ? ${accessor}.value : '_missing_')`;
  });

  return fieldAccessors.join(" + '|' + ");
};

/**
 * Builds the Elasticsearch aggregation query for alert deduplication.
 * Uses terms aggregation on a scripted correlation key to group similar alerts.
 */
export const getDeduplicationAggQuery = (
  config: DeduplicationConfig = DEFAULT_DEDUPLICATION_CONFIG
): AggregationsAggregationContainer => {
  const { correlationFields, maxGroups, maxAlertsPerGroup } = config;

  // Validate correlation fields
  const validFields = correlationFields.filter((field): field is CorrelationField =>
    CORRELATION_FIELDS.includes(field)
  );

  if (validFields.length === 0) {
    throw new Error('At least one valid correlation field must be specified');
  }

  return {
    terms: {
      script: {
        source: buildCorrelationKeyScript(validFields),
        lang: 'painless',
      },
      size: maxGroups,
      order: {
        max_risk_score: 'desc',
      },
    },
    aggs: {
      // Track the maximum risk score for ordering groups
      max_risk_score: {
        max: {
          field: 'kibana.alert.risk_score',
        },
      },
      // Get the top alert in each group (representative alert)
      top_alert: {
        top_hits: {
          size: 1,
          sort: [
            {
              'kibana.alert.risk_score': { order: 'desc' },
            },
            {
              '@timestamp': { order: 'desc' },
            },
          ],
          _source: false,
          // We'll use fields from the main query
        },
      },
      // Collect all alert IDs in the group for reference preservation
      alert_ids: {
        terms: {
          field: '_id',
          size: maxAlertsPerGroup,
        },
      },
      // Get correlation field values for the group
      ...validFields.reduce(
        (acc, field) => ({
          ...acc,
          [`field_${field.replace(/\./g, '_')}`]: {
            terms: {
              field,
              size: 1,
            },
          },
        }),
        {}
      ),
    },
  };
};

/**
 * Builds a filter query to exclude alerts that have already been processed
 * (useful for incremental deduplication)
 */
export const getExcludeProcessedAlertsFilter = (
  processedAlertIds: string[]
): QueryDslQueryContainer | null => {
  if (processedAlertIds.length === 0) {
    return null;
  }

  return {
    bool: {
      must_not: [
        {
          ids: {
            values: processedAlertIds,
          },
        },
      ],
    },
  };
};

/**
 * Configuration presets for common deduplication scenarios
 */
export const DEDUPLICATION_PRESETS = {
  /**
   * Malware deduplication: Groups by file hash + rule + host
   * Best for malware detection alerts where the same malware is detected multiple times
   */
  malware: {
    correlationFields: ['file.hash.sha256', 'kibana.alert.rule.name', 'host.name'] as const,
    maxGroups: 500,
    maxAlertsPerGroup: 100,
  },
  /**
   * Process-based deduplication: Groups by process hash + rule + host
   * Best for behavioral detection alerts tracking process execution
   */
  processBased: {
    correlationFields: ['process.hash.sha256', 'kibana.alert.rule.name', 'host.name'] as const,
    maxGroups: 500,
    maxAlertsPerGroup: 100,
  },
  /**
   * User-focused deduplication: Groups by rule + host + user
   * Best for credential/access related alerts
   */
  userFocused: {
    correlationFields: ['kibana.alert.rule.name', 'host.name', 'user.name'] as const,
    maxGroups: 500,
    maxAlertsPerGroup: 100,
  },
  /**
   * Network-based deduplication: Groups by rule + source/dest IPs
   * Best for network-related detection alerts
   */
  networkBased: {
    correlationFields: ['kibana.alert.rule.name', 'source.ip', 'destination.ip'] as const,
    maxGroups: 500,
    maxAlertsPerGroup: 100,
  },
  /**
   * Aggressive deduplication: Groups by rule + host only
   * Maximum deduplication, groups all alerts from the same rule on the same host
   */
  aggressive: {
    correlationFields: ['kibana.alert.rule.name', 'host.name'] as const,
    maxGroups: 500,
    maxAlertsPerGroup: 100,
  },
} as const satisfies Record<string, DeduplicationConfig>;

export type DeduplicationPreset = keyof typeof DEDUPLICATION_PRESETS;
