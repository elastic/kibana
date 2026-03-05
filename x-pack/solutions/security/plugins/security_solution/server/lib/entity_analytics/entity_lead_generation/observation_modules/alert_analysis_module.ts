/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { LeadEntity, Observation, ObservationModule, ObservationSeverity } from '../types';
import { makeObservation } from './utils';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MODULE_ID = 'behavioral_analysis';
const MODULE_NAME = 'Behavioral Analysis';
const MODULE_PRIORITY = 8;
const MODULE_WEIGHT = 0.3;

const MULTI_TACTIC_RULE_THRESHOLD = 3;
const HIGH_VOLUME_ALERT_THRESHOLD = 10;
const ALERT_LOOKBACK = 'now-7d';

// ---------------------------------------------------------------------------
// Data-driven severity tier configuration
//
// ALERT_SEVERITY_TIERS is ordered highest → lowest.
// collect() uses find() so only the most severe tier fires per entity.
// ---------------------------------------------------------------------------

interface AlertSummary {
  readonly totalAlerts: number;
  readonly severityCounts: Record<string, number>;
  readonly distinctRuleNames: string[];
  readonly maxRiskScore: number;
  readonly topAlerts: Array<{
    readonly id: string;
    readonly severity: string;
    readonly ruleName: string;
    readonly riskScore: number;
    readonly timestamp: string;
  }>;
}

interface AlertSeverityTier {
  getCount(counts: Record<string, number>): number;
  getSeverity(counts: Record<string, number>): ObservationSeverity;
  readonly type: string;
  readonly confidence: number;
  getScore(count: number, summary: AlertSummary): number;
  getDescription(entity: LeadEntity, count: number, counts: Record<string, number>): string;
  readonly includeRuleNames: boolean;
}

const ALERT_SEVERITY_TIERS: readonly AlertSeverityTier[] = [
  {
    type: 'high_severity_alerts',
    confidence: 0.9,
    includeRuleNames: false,
    getCount: (c) => (c.critical ?? 0) + (c.high ?? 0),
    getSeverity: (c) => ((c.critical ?? 0) > 0 ? 'critical' : 'high'),
    getScore: (_count, s) => Math.min(100, s.maxRiskScore),
    getDescription: (entity, _count, c) =>
      `Entity ${entity.name} has ${c.critical ?? 0} critical and ${
        c.high ?? 0
      } high severity alerts in the last 7 days`,
  },
  {
    type: 'medium_severity_alerts',
    confidence: 0.7,
    includeRuleNames: true,
    getCount: (c) => c.medium ?? 0,
    getSeverity: () => 'medium',
    getScore: (count) => Math.min(100, count * 15),
    getDescription: (entity, count) =>
      `Entity ${entity.name} has ${count} medium severity alerts in the last 7 days`,
  },
  {
    type: 'low_severity_alerts',
    confidence: 0.5,
    includeRuleNames: true,
    getCount: (c) => c.low ?? 0,
    getSeverity: () => 'low',
    getScore: (count) => Math.min(100, count * 10),
    getDescription: (entity, count) =>
      `Entity ${entity.name} has ${count} low severity alerts in the last 7 days`,
  },
] as const;

// ---------------------------------------------------------------------------
// Module implementation
// ---------------------------------------------------------------------------

interface BehavioralAnalysisModuleDeps {
  readonly esClient: ElasticsearchClient;
  readonly logger: Logger;
  readonly alertsIndexPattern: string;
}

export const createBehavioralAnalysisModule = ({
  esClient,
  logger,
  alertsIndexPattern,
}: BehavioralAnalysisModuleDeps): ObservationModule => ({
  config: { id: MODULE_ID, name: MODULE_NAME, priority: MODULE_PRIORITY, weight: MODULE_WEIGHT },

  isEnabled: () => Boolean(alertsIndexPattern),

  async collect(entities: LeadEntity[]): Promise<Observation[]> {
    const alertDataByEntity = await fetchAlertSummariesForEntities(
      esClient,
      alertsIndexPattern,
      entities,
      logger
    );
    const observations: Observation[] = [];

    for (const entity of entities) {
      const summary = alertDataByEntity.get(`${entity.type}:${entity.name}`);
      if (summary && summary.totalAlerts > 0) {
        const { severityCounts, totalAlerts, distinctRuleNames } = summary;

        // Observation 1: Severity — highest matching tier wins
        const tier = ALERT_SEVERITY_TIERS.find((t) => t.getCount(severityCounts) > 0);
        if (tier) {
          const count = tier.getCount(severityCounts);
          observations.push(
            makeObservation(entity, MODULE_ID, {
              type: tier.type,
              score: tier.getScore(count, summary),
              severity: tier.getSeverity(severityCounts),
              confidence: tier.confidence,
              description: tier.getDescription(entity, count, severityCounts),
              metadata: {
                severity_counts: severityCounts,
                total_alerts: totalAlerts,
                max_risk_score: summary.maxRiskScore,
                top_alerts: summary.topAlerts,
                ...(tier.includeRuleNames ? { rule_names: distinctRuleNames } : {}),
              },
            })
          );
        }

        // Observation 2: High volume
        if (totalAlerts >= HIGH_VOLUME_ALERT_THRESHOLD) {
          observations.push(
            makeObservation(entity, MODULE_ID, {
              type: 'alert_volume_spike',
              score: Math.min(100, (totalAlerts / HIGH_VOLUME_ALERT_THRESHOLD) * 60),
              severity: totalAlerts >= HIGH_VOLUME_ALERT_THRESHOLD * 3 ? 'high' : 'medium',
              confidence: 0.8,
              description: `Entity ${entity.name} has ${totalAlerts} alerts in the last 7 days, suggesting elevated threat activity`,
              metadata: { total_alerts: totalAlerts, distinct_rules: distinctRuleNames.length },
            })
          );
        }

        // Observation 3: Multi-tactic
        if (distinctRuleNames.length >= MULTI_TACTIC_RULE_THRESHOLD) {
          const ruleCount = distinctRuleNames.length;
          observations.push(
            makeObservation(entity, MODULE_ID, {
              type: 'multi_tactic_attack',
              score: Math.min(100, ruleCount * 20),
              severity: ruleCount >= MULTI_TACTIC_RULE_THRESHOLD * 2 ? 'critical' : 'high',
              confidence: 0.75,
              description: `Entity ${entity.name} is targeted by ${ruleCount} distinct detection rules, indicating a potential multi-tactic attack`,
              metadata: {
                distinct_rule_count: ruleCount,
                rule_names: distinctRuleNames,
                total_alerts: totalAlerts,
              },
            })
          );
        }
      }
    }

    logger.debug(
      `[${MODULE_ID}] Collected ${observations.length} observations from ${entities.length} entities`
    );
    return observations;
  },
});

// ---------------------------------------------------------------------------
// Data fetching — single aggregation query with top_hits to avoid N+1
// ---------------------------------------------------------------------------

const alertSubAggs = () => ({
  severity_breakdown: { terms: { field: 'kibana.alert.severity', size: 10 } },
  distinct_rules: { terms: { field: 'kibana.alert.rule.name', size: 50 } },
  max_risk_score: { max: { field: 'kibana.alert.risk_score' } },
  top_5_alerts: {
    top_hits: {
      size: 5,
      sort: [{ 'kibana.alert.risk_score': { order: 'desc' } }],
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

const fetchAlertSummariesForEntities = async (
  esClient: ElasticsearchClient,
  alertsIndexPattern: string,
  entities: LeadEntity[],
  logger: Logger
): Promise<Map<string, AlertSummary>> => {
  const result = new Map<string, AlertSummary>();

  const userNames = entities.filter((e) => e.type === 'user').map((e) => e.name);
  const hostNames = entities.filter((e) => e.type === 'host').map((e) => e.name);
  const entityTerms: Array<Record<string, unknown>> = [
    ...(userNames.length > 0 ? [{ terms: { 'user.name': userNames } }] : []),
    ...(hostNames.length > 0 ? [{ terms: { 'host.name': hostNames } }] : []),
  ];
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
      aggs: {
        by_user: { terms: { field: 'user.name', size: entities.length }, aggs: alertSubAggs() },
        by_host: { terms: { field: 'host.name', size: entities.length }, aggs: alertSubAggs() },
      },
    });

    parseEntityBuckets(response.aggregations?.by_user, 'user', result);
    parseEntityBuckets(response.aggregations?.by_host, 'host', result);
  } catch (error) {
    logger.warn(`[${MODULE_ID}] Failed to fetch alert summaries: ${error}`);
  }

  return result;
};

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

/** @deprecated Use createBehavioralAnalysisModule. */
export const createAlertAnalysisModule = createBehavioralAnalysisModule;
