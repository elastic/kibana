/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { LeadEntity } from '../../types';
import { ALERT_ENTITY_TYPES, ALERT_LOOKBACK, MODULE_ID, type AlertSummary } from './config';

const alertSubAggs = () => ({
  severity_breakdown: { terms: { field: 'kibana.alert.severity', size: 10 } },
  distinct_rules: { terms: { field: 'kibana.alert.rule.name', size: 50 } },
  max_risk_score: { max: { field: 'kibana.alert.risk_score' } },
  top_5_alerts: {
    top_hits: {
      size: 5,
      sort: [{ 'kibana.alert.risk_score': { order: 'desc' as const } }],
      _source: false,
      fields: [
        'kibana.alert.severity',
        'kibana.alert.rule.name',
        'kibana.alert.risk_score',
        '@timestamp',
      ],
    },
  },
});

interface AlertBucket {
  key: string;
  doc_count: number;
  severity_breakdown: { buckets: Array<{ key: string; doc_count: number }> };
  distinct_rules: { buckets: Array<{ key: string; doc_count: number }> };
  max_risk_score: { value: number | null };
  top_5_alerts: { hits: { hits: Array<{ _id: string; fields?: Record<string, unknown[]> }> } };
}

const parseEntityBuckets = (
  agg: unknown,
  entityType: string,
  target: Map<string, AlertSummary>
): void => {
  const buckets = ((agg as Record<string, unknown>)?.buckets ?? []) as AlertBucket[];

  for (const bucket of buckets) {
    const topAlerts = bucket.top_5_alerts.hits.hits.map(({ _id, fields = {} }) => ({
      id: _id,
      severity: String(fields['kibana.alert.severity']?.[0] ?? 'unknown'),
      ruleName: String(fields['kibana.alert.rule.name']?.[0] ?? 'unknown'),
      riskScore: Number(fields['kibana.alert.risk_score']?.[0] ?? 0),
      timestamp: String(fields['@timestamp']?.[0] ?? ''),
    }));

    target.set(`${entityType}:${bucket.key}`, {
      totalAlerts: bucket.doc_count,
      severityCounts: Object.fromEntries(
        bucket.severity_breakdown.buckets.map((b) => [b.key, b.doc_count])
      ),
      distinctRuleNames: bucket.distinct_rules.buckets.map((r) => r.key),
      maxRiskScore: bucket.max_risk_score.value ?? 0,
      topAlerts,
    });
  }
};

export const fetchAlertSummariesForEntities = async (
  esClient: ElasticsearchClient,
  alertsIndexPattern: string,
  entities: LeadEntity[],
  logger: Logger
): Promise<Map<string, AlertSummary>> => {
  const result = new Map<string, AlertSummary>();

  const namesByType: Record<string, string[]> = {};
  for (const e of entities) {
    if (ALERT_ENTITY_TYPES.includes(e.type as (typeof ALERT_ENTITY_TYPES)[number])) {
      const list = namesByType[e.type] ?? [];
      list.push(e.name);
      namesByType[e.type] = list;
    }
  }

  const entityTerms: Array<Record<string, unknown>> = Object.entries(namesByType)
    .filter(([, names]) => names.length > 0)
    .map(([type, names]) => ({ terms: { [`${type}.name`]: names } }));
  if (entityTerms.length === 0) return result;

  try {
    const response = await esClient.search({
      index: alertsIndexPattern,
      size: 0,
      ignore_unavailable: true,
      allow_no_indices: true,
      query: {
        bool: {
          filter: [
            { bool: { should: entityTerms, minimum_should_match: 1 } },
            { terms: { 'kibana.alert.workflow_status': ['open', 'acknowledged'] } },
            { range: { '@timestamp': { gte: ALERT_LOOKBACK, lte: 'now' } } },
          ],
          must_not: [{ exists: { field: 'kibana.alert.building_block_type' } }],
        },
      },
      aggs: Object.fromEntries(
        Object.keys(namesByType).map((type) => [
          `by_${type}`,
          { terms: { field: `${type}.name`, size: entities.length }, aggs: alertSubAggs() },
        ])
      ),
    });

    for (const type of Object.keys(namesByType)) {
      parseEntityBuckets(response.aggregations?.[`by_${type}`], type, result);
    }
  } catch (error) {
    logger.warn(`[${MODULE_ID}] Failed to fetch alert summaries: ${error}`);
  }

  return result;
};
