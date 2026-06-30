/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { euid } from '@kbn/entity-store/common/euid_helpers';
import type { LeadEntity } from '../../types';
import { parseAlertBuckets } from '../types';
import { errorMessage } from '../utils';
import { ALERT_ENTITY_TYPES, ALERT_LOOKBACK, MODULE_ID, type AlertSummary } from './config';

type AlertEntityType = (typeof ALERT_ENTITY_TYPES)[number];

const isAlertEntityType = (type: string): type is AlertEntityType =>
  (ALERT_ENTITY_TYPES as readonly string[]).includes(type);

const alertSubAggs = () => ({
  severity_breakdown: { terms: { field: 'kibana.alert.severity', size: 10 } },
  distinct_rules: { terms: { field: 'kibana.alert.rule.name', size: 50 } },
  max_risk_score: { max: { field: 'kibana.alert.risk_score' } },
  top_alerts: {
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

const runtimeFieldName = (type: AlertEntityType): string => `entity_id_${type}`;

const parseEntityBuckets = (agg: unknown, target: Map<string, AlertSummary>): void => {
  const buckets = parseAlertBuckets(agg);

  for (const bucket of buckets) {
    const topAlerts = bucket.top_alerts.hits.hits.map(({ _id, fields = {} }) => ({
      id: _id,
      severity: String(fields['kibana.alert.severity']?.[0] ?? 'unknown'),
      ruleName: String(fields['kibana.alert.rule.name']?.[0] ?? 'unknown'),
      riskScore: Number(fields['kibana.alert.risk_score']?.[0] ?? 0),
      timestamp: String(fields['@timestamp']?.[0] ?? ''),
    }));

    target.set(bucket.key, {
      totalAlerts: bucket.doc_count,
      severityCounts: Object.fromEntries(
        bucket.severity_breakdown.buckets.map((b) => [b.key, b.doc_count])
      ),
      distinctRuleNames: bucket.distinct_rules.buckets.map((r) => r.key),
      maxRiskScore: bucket.max_risk_score?.value ?? 0,
      topAlerts,
    });
  }
};

/** Maximum entity buckets requested per ES aggregation call. */
const ENTITY_BUCKET_LIMIT = 500;

export const fetchAlertSummariesForEntities = async (
  esClient: ElasticsearchClient,
  alertsIndexPattern: string,
  entities: LeadEntity[],
  logger: Logger
): Promise<Map<string, AlertSummary>> => {
  const result = new Map<string, AlertSummary>();

  const euidsByType = new Map<AlertEntityType, string[]>();
  for (const e of entities) {
    if (isAlertEntityType(e.type)) {
      const existing = euidsByType.get(e.type) ?? [];
      existing.push(e.id);
      euidsByType.set(e.type, existing);
    }
  }
  if (euidsByType.size === 0) return result;

  const runtimeMappings = Object.fromEntries(
    Array.from(euidsByType.keys(), (type) => [
      runtimeFieldName(type),
      euid.painless.getEuidRuntimeMapping(type),
    ])
  );

  const entityTerms = Array.from(euidsByType, ([type, euids]) => ({
    terms: { [runtimeFieldName(type)]: euids },
  }));

  const aggs = Object.fromEntries(
    Array.from(euidsByType, ([type, euids]) => [
      `by_${type}`,
      {
        terms: {
          field: runtimeFieldName(type),
          size: Math.min(euids.length, ENTITY_BUCKET_LIMIT),
        },
        aggs: alertSubAggs(),
      },
    ])
  );

  try {
    const response = await esClient.search({
      index: alertsIndexPattern,
      size: 0,
      ignore_unavailable: true,
      allow_no_indices: true,
      runtime_mappings: runtimeMappings,
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
      aggs,
    });

    for (const type of euidsByType.keys()) {
      parseEntityBuckets(response.aggregations?.[`by_${type}`], result);
    }
  } catch (error) {
    logger.warn(`[${MODULE_ID}] Failed to fetch alert summaries: ${errorMessage(error)}`);
  }

  return result;
};
