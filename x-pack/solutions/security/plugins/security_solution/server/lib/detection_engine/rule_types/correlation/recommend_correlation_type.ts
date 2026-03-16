/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

interface RecommendConfig {
  rules: string[];
  groupByFields: string[];
  timespan: string;
  spaceId: string;
}

interface RecommendationStats {
  alertCountPerRule: Record<string, number>;
  groupByCardinality: Record<string, number>;
  avgTimeBetweenAlerts: number | null;
}

type CorrelationType = 'temporal' | 'temporal_ordered' | 'event_count' | 'value_count';
type Confidence = 'high' | 'medium' | 'low';

export interface CorrelationTypeRecommendationResult {
  type: CorrelationType;
  confidence: Confidence;
  reason: string;
  stats: RecommendationStats;
}

const parseTimespanToMs = (timespan: string): number => {
  const match = timespan.match(/^(\d+)([smhd])$/);
  if (!match) {
    return 5 * 60 * 1000; // default 5m
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return value * (multipliers[unit] ?? 60 * 1000);
};

const HIGH_CARDINALITY_THRESHOLD = 100;

const escapeEsqlValue = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const VALID_FIELD_NAME_RE = /^[a-zA-Z_][a-zA-Z0-9_.]*$/;

const queryAlertCountPerRule = async (
  esClient: ElasticsearchClient,
  alertsIndex: string,
  rules: string[],
  timespanMs: number
): Promise<Record<string, number>> => {
  const ruleFilter = rules.map((r) => `"${escapeEsqlValue(r)}"`).join(', ');
  const query = `FROM ${alertsIndex}
    | WHERE @timestamp >= NOW() - ${timespanMs}ms
      AND kibana.alert.rule.uuid IN (${ruleFilter})
    | STATS alert_count = COUNT(*) BY kibana.alert.rule.uuid
    | LIMIT 1000`;

  const result = await esClient.esql.query({ query, drop_null_columns: true });
  const alertCountPerRule: Record<string, number> = {};

  const columns = result.columns ?? [];
  const countIdx = columns.findIndex((c) => c.name === 'alert_count');
  const ruleIdx = columns.findIndex((c) => c.name === 'kibana.alert.rule.uuid');

  for (const row of result.values ?? []) {
    const ruleId = String(row[ruleIdx] ?? '');
    const count = Number(row[countIdx] ?? 0);
    if (ruleId) {
      alertCountPerRule[ruleId] = count;
    }
  }

  return alertCountPerRule;
};

const queryGroupByCardinality = async (
  esClient: ElasticsearchClient,
  alertsIndex: string,
  rules: string[],
  groupByFields: string[],
  timespanMs: number
): Promise<Record<string, number>> => {
  for (const f of groupByFields) {
    if (!VALID_FIELD_NAME_RE.test(f)) {
      throw new Error(`Invalid field name: "${f}"`);
    }
  }
  const ruleFilter = rules.map((r) => `"${escapeEsqlValue(r)}"`).join(', ');
  const cardinalityExprs = groupByFields
    .map((f) => `\`${f}_cardinality\` = COUNT_DISTINCT(\`${f}\`)`)
    .join(', ');

  const query = `FROM ${alertsIndex}
    | WHERE @timestamp >= NOW() - ${timespanMs}ms
      AND kibana.alert.rule.uuid IN (${ruleFilter})
    | STATS ${cardinalityExprs}
    | LIMIT 1`;

  const result = await esClient.esql.query({ query, drop_null_columns: true });
  const cardinality: Record<string, number> = {};

  const columns = result.columns ?? [];
  const firstRow = (result.values ?? [])[0];

  if (firstRow) {
    for (const field of groupByFields) {
      const colIdx = columns.findIndex((c) => c.name === `${field}_cardinality`);
      if (colIdx >= 0) {
        cardinality[field] = Number(firstRow[colIdx] ?? 0);
      }
    }
  }

  return cardinality;
};

const queryTemporalDistribution = async (
  esClient: ElasticsearchClient,
  alertsIndex: string,
  rules: string[],
  timespanMs: number
): Promise<number | null> => {
  const ruleFilter = rules.map((r) => `"${escapeEsqlValue(r)}"`).join(', ');
  const query = `FROM ${alertsIndex}
    | WHERE @timestamp >= NOW() - ${timespanMs}ms
      AND kibana.alert.rule.uuid IN (${ruleFilter})
    | SORT @timestamp ASC
    | LIMIT 1000`;

  const result = await esClient.esql.query({ query, drop_null_columns: true });
  const columns = result.columns ?? [];
  const tsIdx = columns.findIndex((c) => c.name === '@timestamp');
  const rows = result.values ?? [];

  if (rows.length < 2) {
    return null;
  }

  const timestamps = rows
    .map((row) => new Date(String(row[tsIdx])).getTime())
    .filter((ts) => !isNaN(ts))
    .sort((a, b) => a - b);

  if (timestamps.length < 2) {
    return null;
  }

  let totalGap = 0;
  for (let i = 1; i < timestamps.length; i++) {
    totalGap += timestamps[i] - timestamps[i - 1];
  }

  return totalGap / (timestamps.length - 1);
};

export const recommendCorrelationType = async (
  esClient: ElasticsearchClient,
  config: RecommendConfig
): Promise<CorrelationTypeRecommendationResult> => {
  const { rules, groupByFields, timespan, spaceId } = config;
  const alertsIndex = `.alerts-security.alerts-${spaceId}`;
  const timespanMs = parseTimespanToMs(timespan);

  const [alertCountPerRule, groupByCardinality, avgTimeBetweenAlerts] = await Promise.all([
    queryAlertCountPerRule(esClient, alertsIndex, rules, timespanMs),
    queryGroupByCardinality(esClient, alertsIndex, rules, groupByFields, timespanMs),
    queryTemporalDistribution(esClient, alertsIndex, rules, timespanMs),
  ]);

  const stats: RecommendationStats = {
    alertCountPerRule,
    groupByCardinality,
    avgTimeBetweenAlerts,
  };

  const rulesWithAlerts = Object.keys(alertCountPerRule).length;
  const hasHighCardinality = Object.values(groupByCardinality).some(
    (v) => v > HIGH_CARDINALITY_THRESHOLD
  );

  if (hasHighCardinality) {
    return {
      type: 'value_count',
      confidence: 'high',
      reason:
        'Group-by fields have very high cardinality (>100 distinct values), suggesting value_count to detect breadth of impact',
      stats,
    };
  }

  if (rulesWithAlerts <= 1) {
    if (hasHighCardinality) {
      return {
        type: 'value_count',
        confidence: 'medium',
        reason:
          'Single rule with high-cardinality group-by fields suggests detecting breadth of distinct values',
        stats,
      };
    }
    return {
      type: 'event_count',
      confidence: rulesWithAlerts === 0 ? 'low' : 'medium',
      reason:
        rulesWithAlerts === 0
          ? 'No alerts found for the selected rules in the timespan — defaulting to event_count for volume spike detection'
          : 'Single rule with alerts suggests detecting volume spikes (e.g., brute force, spray attacks)',
      stats,
    };
  }

  const alertsAreTemporallyClose =
    avgTimeBetweenAlerts !== null && avgTimeBetweenAlerts < timespanMs / 2;

  if (rulesWithAlerts === 2 && alertsAreTemporallyClose) {
    return {
      type: 'temporal',
      confidence: 'high',
      reason:
        'Two rules with temporally close alerts suggest signal convergence — temporal correlation is recommended',
      stats,
    };
  }

  if (rulesWithAlerts >= 3 && alertsAreTemporallyClose) {
    return {
      type: 'temporal_ordered',
      confidence: 'high',
      reason:
        'Multiple rules with temporally close alerts suggest an attack chain where stage ordering matters',
      stats,
    };
  }

  if (rulesWithAlerts >= 3) {
    return {
      type: 'temporal_ordered',
      confidence: 'medium',
      reason:
        'Multiple rules produced alerts but temporal proximity is unclear — temporal_ordered may still capture attack chains',
      stats,
    };
  }

  return {
    type: 'temporal',
    confidence: 'low',
    reason:
      'Two rules produced alerts without strong temporal clustering — temporal correlation may still detect co-occurring signals',
    stats,
  };
};
