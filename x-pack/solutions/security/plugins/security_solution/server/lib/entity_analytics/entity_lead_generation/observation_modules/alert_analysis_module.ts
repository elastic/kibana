/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { LeadEntity, Observation, ObservationModule, ObservationSeverity } from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MODULE_ID = 'behavioral_analysis';
const MODULE_NAME = 'Behavioral Analysis';
const MODULE_PRIORITY = 8;
const MODULE_WEIGHT = 0.3;

/** Minimum number of distinct rule names to flag multi-tactic activity */
const MULTI_TACTIC_RULE_THRESHOLD = 3;
/** Alert volume spike: more than this many alerts in the window = notable */
const HIGH_VOLUME_ALERT_THRESHOLD = 10;
/** Default look-back window for alerts */
const ALERT_LOOKBACK = 'now-7d';

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
}: BehavioralAnalysisModuleDeps): ObservationModule => {
  return {
    config: {
      id: MODULE_ID,
      name: MODULE_NAME,
      priority: MODULE_PRIORITY,
      weight: MODULE_WEIGHT,
    },

    isEnabled(): boolean {
      return alertsIndexPattern != null && alertsIndexPattern.length > 0;
    },

    async collect(entities: LeadEntity[]): Promise<Observation[]> {
      const observations: Observation[] = [];

      const alertDataByEntity = await fetchAlertSummariesForEntities(
        esClient,
        alertsIndexPattern,
        entities,
        logger
      );

      for (const entity of entities) {
        const key = entityToKey(entity);
        const alertSummary = alertDataByEntity.get(key);

        if (alertSummary && alertSummary.totalAlerts > 0) {
          // Observation 1: Severity breakdown
          const criticalOrHighCount =
            (alertSummary.severityCounts.critical ?? 0) + (alertSummary.severityCounts.high ?? 0);
          const mediumCount = alertSummary.severityCounts.medium ?? 0;
          const lowCount = alertSummary.severityCounts.low ?? 0;

          if (criticalOrHighCount > 0) {
            observations.push(buildSeverityObservation(entity, alertSummary));
          } else if (mediumCount > 0) {
            observations.push(buildMediumSeverityObservation(entity, alertSummary, mediumCount));
          } else if (lowCount > 0) {
            observations.push(buildLowSeverityObservation(entity, alertSummary, lowCount));
          }

          // Observation 2: High volume — flag alert spikes
          if (alertSummary.totalAlerts >= HIGH_VOLUME_ALERT_THRESHOLD) {
            observations.push(buildHighVolumeObservation(entity, alertSummary));
          }

          // Observation 3: Multi-tactic — flag entities targeted by many distinct rules
          if (alertSummary.distinctRuleNames.length >= MULTI_TACTIC_RULE_THRESHOLD) {
            observations.push(buildMultiTacticObservation(entity, alertSummary));
          }
        }
      }

      logger.debug(
        `[${MODULE_ID}] Collected ${observations.length} observations from ${entities.length} entities`
      );

      return observations;
    },
  };
};

// ---------------------------------------------------------------------------
// Data types
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

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

const fetchAlertSummariesForEntities = async (
  esClient: ElasticsearchClient,
  alertsIndexPattern: string,
  entities: LeadEntity[],
  logger: Logger
): Promise<Map<string, AlertSummary>> => {
  const result = new Map<string, AlertSummary>();

  // Build a single aggregation query that groups alerts by entity
  // We query for user.name and host.name in parallel using should clauses
  const entityTerms = buildEntityMatchClauses(entities);

  try {
    const response = await esClient.search({
      index: alertsIndexPattern,
      size: 0,
      ignore_unavailable: true,
      allow_no_indices: true,
      query: {
        bool: {
          filter: [
            {
              bool: {
                should: entityTerms,
                minimum_should_match: 1,
              },
            },
            {
              bool: {
                should: [
                  { match_phrase: { 'kibana.alert.workflow_status': 'open' } },
                  { match_phrase: { 'kibana.alert.workflow_status': 'acknowledged' } },
                ],
                minimum_should_match: 1,
              },
            },
            {
              range: {
                '@timestamp': { gte: ALERT_LOOKBACK, lte: 'now' },
              },
            },
          ],
          must_not: [{ exists: { field: 'kibana.alert.building_block_type' } }],
        },
      },
      aggs: {
        by_user: {
          terms: { field: 'user.name', size: entities.length },
          aggs: alertSubAggs(),
        },
        by_host: {
          terms: { field: 'host.name', size: entities.length },
          aggs: alertSubAggs(),
        },
      },
    });

    // Parse user-based aggregations
    parseEntityBuckets(response.aggregations?.by_user, 'user', result);

    // Parse host-based aggregations
    parseEntityBuckets(response.aggregations?.by_host, 'host', result);
  } catch (error) {
    logger.warn(`[${MODULE_ID}] Failed to fetch alert summaries: ${error}`);
  }

  // Fetch top alerts per entity for richer observations
  await enrichWithTopAlerts(esClient, alertsIndexPattern, entities, result, logger);

  return result;
};

const alertSubAggs = () => ({
  severity_breakdown: {
    terms: { field: 'kibana.alert.severity', size: 10 },
  },
  distinct_rules: {
    terms: { field: 'kibana.alert.rule.name', size: 50 },
  },
  max_risk_score: {
    max: { field: 'kibana.alert.risk_score' },
  },
});

const buildEntityMatchClauses = (entities: LeadEntity[]): Array<Record<string, unknown>> => {
  const userNames = entities.filter((e) => e.type === 'user').map((e) => e.name);
  const hostNames = entities.filter((e) => e.type === 'host').map((e) => e.name);
  const clauses: Array<Record<string, unknown>> = [];

  if (userNames.length > 0) {
    clauses.push({ terms: { 'user.name': userNames } });
  }
  if (hostNames.length > 0) {
    clauses.push({ terms: { 'host.name': hostNames } });
  }

  return clauses;
};

const parseEntityBuckets = (
  agg: unknown,
  entityType: string,
  target: Map<string, AlertSummary>
): void => {
  const aggObj = agg as Record<string, unknown> | undefined;
  const buckets = (aggObj?.buckets ?? []) as Array<{
    key: string;
    doc_count: number;
    severity_breakdown: { buckets: Array<{ key: string; doc_count: number }> };
    distinct_rules: { buckets: Array<{ key: string; doc_count: number }> };
    max_risk_score: { value: number | null };
  }>;

  for (const bucket of buckets) {
    const severityCounts: Record<string, number> = {};
    for (const sevBucket of bucket.severity_breakdown.buckets) {
      severityCounts[sevBucket.key] = sevBucket.doc_count;
    }

    const distinctRuleNames = bucket.distinct_rules.buckets.map((r) => r.key);

    target.set(`${entityType}:${bucket.key}`, {
      totalAlerts: bucket.doc_count,
      severityCounts,
      distinctRuleNames,
      maxRiskScore: bucket.max_risk_score.value ?? 0,
      topAlerts: [], // populated by enrichWithTopAlerts
    });
  }
};

const enrichWithTopAlerts = async (
  esClient: ElasticsearchClient,
  alertsIndexPattern: string,
  entities: LeadEntity[],
  summaries: Map<string, AlertSummary>,
  logger: Logger
): Promise<void> => {
  for (const entity of entities) {
    const key = entityToKey(entity);
    const summary = summaries.get(key);
    if (summary && summary.totalAlerts > 0) {
      const fieldName = entity.type === 'user' ? 'user.name' : 'host.name';

      try {
        const response = await esClient.search({
          index: alertsIndexPattern,
          size: 5,
          ignore_unavailable: true,
          allow_no_indices: true,
          sort: [{ 'kibana.alert.risk_score': { order: 'desc' } }],
          _source: false,
          fields: [
            'kibana.alert.severity',
            'kibana.alert.rule.name',
            'kibana.alert.risk_score',
            '@timestamp',
          ],
          query: {
            bool: {
              filter: [
                { term: { [fieldName]: entity.name } },
                {
                  bool: {
                    should: [
                      { match_phrase: { 'kibana.alert.workflow_status': 'open' } },
                      { match_phrase: { 'kibana.alert.workflow_status': 'acknowledged' } },
                    ],
                    minimum_should_match: 1,
                  },
                },
                { range: { '@timestamp': { gte: ALERT_LOOKBACK, lte: 'now' } } },
              ],
              must_not: [{ exists: { field: 'kibana.alert.building_block_type' } }],
            },
          },
        });

        const topAlerts = response.hits.hits.map((hit) => {
          const fields = hit.fields ?? {};
          return {
            id: hit._id ?? '',
            severity: String(getFirstFieldValue(fields, 'kibana.alert.severity') ?? 'unknown'),
            ruleName: String(getFirstFieldValue(fields, 'kibana.alert.rule.name') ?? 'unknown'),
            riskScore: Number(getFirstFieldValue(fields, 'kibana.alert.risk_score') ?? 0),
            timestamp: String(getFirstFieldValue(fields, '@timestamp') ?? ''),
          };
        });

        // Replace the summary with the enriched version
        summaries.set(key, { ...summary, topAlerts });
      } catch (error) {
        logger.warn(`[${MODULE_ID}] Failed to fetch top alerts for ${entity.name}: ${error}`);
      }
    }
  }
};

// ---------------------------------------------------------------------------
// Observation builders
// ---------------------------------------------------------------------------

const buildSeverityObservation = (entity: LeadEntity, summary: AlertSummary): Observation => {
  const criticalCount = summary.severityCounts.critical ?? 0;
  const highCount = summary.severityCounts.high ?? 0;
  const severity: ObservationSeverity = criticalCount > 0 ? 'critical' : 'high';

  return {
    entityId: entityToKey(entity),
    moduleId: MODULE_ID,
    type: 'high_severity_alerts',
    score: Math.min(100, summary.maxRiskScore),
    severity,
    confidence: 0.9,
    description: `Entity ${entity.name} has ${criticalCount} critical and ${highCount} high severity alerts in the last 7 days`,
    metadata: {
      severity_counts: summary.severityCounts,
      total_alerts: summary.totalAlerts,
      max_risk_score: summary.maxRiskScore,
      top_alerts: summary.topAlerts,
    },
  };
};

const buildMediumSeverityObservation = (
  entity: LeadEntity,
  summary: AlertSummary,
  mediumCount: number
): Observation => {
  return {
    entityId: entityToKey(entity),
    moduleId: MODULE_ID,
    type: 'medium_severity_alerts',
    score: Math.min(100, mediumCount * 15),
    severity: 'medium',
    confidence: 0.7,
    description: `Entity ${entity.name} has ${mediumCount} medium severity alerts in the last 7 days`,
    metadata: {
      severity_counts: summary.severityCounts,
      total_alerts: summary.totalAlerts,
      max_risk_score: summary.maxRiskScore,
      top_alerts: summary.topAlerts,
      rule_names: summary.distinctRuleNames,
    },
  };
};

const buildLowSeverityObservation = (
  entity: LeadEntity,
  summary: AlertSummary,
  lowCount: number
): Observation => {
  return {
    entityId: entityToKey(entity),
    moduleId: MODULE_ID,
    type: 'low_severity_alerts',
    score: Math.min(100, lowCount * 10),
    severity: 'low',
    confidence: 0.5,
    description: `Entity ${entity.name} has ${lowCount} low severity alerts in the last 7 days`,
    metadata: {
      severity_counts: summary.severityCounts,
      total_alerts: summary.totalAlerts,
      max_risk_score: summary.maxRiskScore,
      top_alerts: summary.topAlerts,
      rule_names: summary.distinctRuleNames,
    },
  };
};

const buildHighVolumeObservation = (entity: LeadEntity, summary: AlertSummary): Observation => {
  const score = Math.min(100, (summary.totalAlerts / HIGH_VOLUME_ALERT_THRESHOLD) * 60);
  const severity: ObservationSeverity =
    summary.totalAlerts >= HIGH_VOLUME_ALERT_THRESHOLD * 3 ? 'high' : 'medium';

  return {
    entityId: entityToKey(entity),
    moduleId: MODULE_ID,
    type: 'alert_volume_spike',
    score,
    severity,
    confidence: 0.8,
    description: `Entity ${entity.name} has ${summary.totalAlerts} alerts in the last 7 days, suggesting elevated threat activity`,
    metadata: {
      total_alerts: summary.totalAlerts,
      distinct_rules: summary.distinctRuleNames.length,
    },
  };
};

const buildMultiTacticObservation = (entity: LeadEntity, summary: AlertSummary): Observation => {
  const ruleCount = summary.distinctRuleNames.length;
  const score = Math.min(100, ruleCount * 20);
  const severity: ObservationSeverity =
    ruleCount >= MULTI_TACTIC_RULE_THRESHOLD * 2 ? 'critical' : 'high';

  return {
    entityId: entityToKey(entity),
    moduleId: MODULE_ID,
    type: 'multi_tactic_attack',
    score,
    severity,
    confidence: 0.75,
    description: `Entity ${entity.name} is targeted by ${ruleCount} distinct detection rules, indicating a potential multi-tactic attack`,
    metadata: {
      distinct_rule_count: ruleCount,
      rule_names: summary.distinctRuleNames,
      total_alerts: summary.totalAlerts,
    },
  };
};

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

const entityToKey = (entity: LeadEntity): string => `${entity.type}:${entity.name}`;

const getFirstFieldValue = (fields: Record<string, unknown>, fieldName: string): unknown => {
  const value = fields[fieldName];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

/** @deprecated Use createBehavioralAnalysisModule. Kept for backward compatibility. */
export const createAlertAnalysisModule = createBehavioralAnalysisModule;
