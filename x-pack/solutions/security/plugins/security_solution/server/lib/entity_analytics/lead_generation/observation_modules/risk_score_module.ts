/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { LeadEntity, Observation, ObservationModule, ObservationSeverity } from '../types';
import { makeObservation, getEntityField, groupEntitiesByType } from './utils';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MODULE_ID = 'risk_analysis';
const MODULE_NAME = 'Risk Analysis';
const MODULE_PRIORITY = 10;
const MODULE_WEIGHT = 0.35;

const LOW_RISK_THRESHOLD = 20;
const MODERATE_RISK_THRESHOLD = 40;
const HIGH_RISK_THRESHOLD = 70;
const CRITICAL_RISK_THRESHOLD = 90;
const ESCALATION_DELTA_24H = 10;
const ESCALATION_DELTA_7D_90D = 20;
/** At or above this delta, the escalation severity bumps up one tier */
const ESCALATION_CRITICAL_DELTA = 40;

// ---------------------------------------------------------------------------
// Data-driven tier configurations
// ---------------------------------------------------------------------------

interface RiskLevelTier {
  readonly threshold: number;
  readonly type: string;
  readonly severity: ObservationSeverity | ((score: number) => ObservationSeverity);
  readonly confidence: number;
  readonly descriptionSuffix: string;
}

/**
 * Ordered highest → lowest. The first matching tier wins.
 * Using a function for severity allows the high/critical boundary to be
 * computed at call time without a separate if/else in collect().
 */
const RISK_LEVEL_TIERS: readonly RiskLevelTier[] = [
  {
    threshold: HIGH_RISK_THRESHOLD,
    type: 'high_risk_score',
    severity: (s) => (s >= CRITICAL_RISK_THRESHOLD ? 'critical' : 'high'),
    confidence: 0.95,
    descriptionSuffix: '',
  },
  {
    threshold: MODERATE_RISK_THRESHOLD,
    type: 'moderate_risk_score',
    severity: 'medium',
    confidence: 0.8,
    descriptionSuffix: ', warranting monitoring',
  },
  {
    threshold: LOW_RISK_THRESHOLD,
    type: 'low_risk_score',
    severity: 'low',
    confidence: 0.6,
    descriptionSuffix: '',
  },
] as const;

interface EscalationWindow {
  readonly daysBack: number;
  readonly threshold: number;
  readonly type: string;
  /** Severity when delta < ESCALATION_CRITICAL_DELTA */
  readonly baseSeverity: ObservationSeverity;
  /** Severity when delta >= ESCALATION_CRITICAL_DELTA */
  readonly criticalSeverity: ObservationSeverity;
  readonly label: string;
}

const ESCALATION_WINDOWS: readonly EscalationWindow[] = [
  {
    daysBack: 1,
    threshold: ESCALATION_DELTA_24H,
    type: 'risk_escalation_24h',
    baseSeverity: 'critical',
    criticalSeverity: 'critical',
    label: '24 hours',
  },
  {
    daysBack: 7,
    threshold: ESCALATION_DELTA_7D_90D,
    type: 'risk_escalation_7d',
    baseSeverity: 'high',
    criticalSeverity: 'critical',
    label: '7 days',
  },
  {
    daysBack: 90,
    threshold: ESCALATION_DELTA_7D_90D,
    type: 'risk_escalation_90d',
    baseSeverity: 'medium',
    criticalSeverity: 'high',
    label: '90 days',
  },
] as const;

// ---------------------------------------------------------------------------
// Risk Score Analysis Module
//
// Current risk scores are read directly from the Entity Store V2 record
// (entity.risk.calculated_score_norm). The time-series risk-score index is
// queried only for escalation detection (24h / 7d / 90d windows).
// ---------------------------------------------------------------------------

interface RiskScoreModuleDeps {
  readonly esClient: ElasticsearchClient;
  readonly logger: Logger;
  readonly spaceId: string;
}

export const createRiskScoreModule = ({
  esClient,
  logger,
  spaceId,
}: RiskScoreModuleDeps): ObservationModule => ({
  config: { id: MODULE_ID, name: MODULE_NAME, priority: MODULE_PRIORITY, weight: MODULE_WEIGHT },

  isEnabled: () => true,

  async collect(entities: LeadEntity[]): Promise<Observation[]> {
    const timeSeriesScores = await fetchTimeSeriesRiskScores(esClient, spaceId, entities, logger);
    const observations: Observation[] = [];

    for (const entity of entities) {
      const internals = extractEntityInternals(entity);
      if (internals) {
        const { scoreNorm, level, isPrivileged } = internals;
        const historicalScores = timeSeriesScores.get(`${entity.type}:${entity.name}`) ?? [];

        // Observation 1: Current risk level — first matching tier wins
        const tier = RISK_LEVEL_TIERS.find((t) => scoreNorm >= t.threshold);
        if (tier) {
          const severity =
            typeof tier.severity === 'function' ? tier.severity(scoreNorm) : tier.severity;
          observations.push(
            makeObservation(entity, MODULE_ID, {
              type: tier.type,
              score: scoreNorm,
              severity,
              confidence: tier.confidence,
              description: `Entity ${entity.name} has a ${level} risk score of ${scoreNorm.toFixed(
                1
              )}${tier.descriptionSuffix}`,
              metadata: {
                calculated_score_norm: scoreNorm,
                calculated_level: level,
                entity_type: entity.type,
              },
            })
          );
        }

        // Observation 2: Risk escalation — one check per time window
        for (const w of ESCALATION_WINDOWS) {
          const esc = detectEscalation(scoreNorm, historicalScores, w.daysBack, w.threshold);
          if (esc) {
            const severity =
              esc.delta >= ESCALATION_CRITICAL_DELTA ? w.criticalSeverity : w.baseSeverity;
            observations.push(
              makeObservation(entity, MODULE_ID, {
                type: w.type,
                score: Math.min(100, esc.delta * 2),
                severity,
                confidence: 0.85,
                description: `Entity ${entity.name} risk score escalated by ${esc.delta.toFixed(
                  1
                )} points (from ${esc.previousScore.toFixed(1)} to ${scoreNorm.toFixed(
                  1
                )}) in the last ${w.label}`,
                metadata: {
                  current_score: scoreNorm,
                  previous_score: esc.previousScore,
                  delta: esc.delta,
                  entity_type: entity.type,
                  window: w.label,
                },
              })
            );
          }
        }

        // Observation 3: Privileged entity with elevated risk
        if (isPrivileged && scoreNorm >= HIGH_RISK_THRESHOLD) {
          observations.push(
            makeObservation(entity, MODULE_ID, {
              type: 'privileged_high_risk',
              score: Math.min(100, scoreNorm * 1.2),
              severity: 'critical',
              confidence: 0.95,
              description: `Privileged entity ${
                entity.name
              } has a ${level} risk score of ${scoreNorm.toFixed(
                1
              )} — elevated concern due to privileged access`,
              metadata: {
                calculated_score_norm: scoreNorm,
                calculated_level: level,
                entity_type: entity.type,
                is_privileged: true,
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
// Entity record accessors
// ---------------------------------------------------------------------------

interface EntityInternals {
  readonly scoreNorm: number;
  readonly level: string;
  readonly isPrivileged: boolean;
}

const extractEntityInternals = (entity: LeadEntity): EntityInternals | undefined => {
  const entityField = getEntityField(entity);
  if (!entityField) return undefined;

  const risk = entityField.risk as
    | { calculated_score_norm?: unknown; calculated_level?: string }
    | undefined;
  if (risk?.calculated_score_norm == null) return undefined;

  const scoreNorm = Number(risk.calculated_score_norm);
  if (Number.isNaN(scoreNorm)) return undefined;

  const attributes = entityField.attributes as { privileged?: boolean } | undefined;
  return {
    scoreNorm,
    level: risk.calculated_level ?? 'Unknown',
    isPrivileged: attributes?.privileged === true,
  };
};

// ---------------------------------------------------------------------------
// Time-series risk score fetching (for escalation detection)
//
// Fetches 90-day daily averages per entity, oldest → newest.
// All escalation windows (24h, 7d, 90d) are derived from this single query.
// ---------------------------------------------------------------------------

const fetchTimeSeriesRiskScores = async (
  esClient: ElasticsearchClient,
  spaceId: string,
  entities: LeadEntity[],
  logger: Logger
): Promise<Map<string, number[]>> => {
  const result = new Map<string, number[]>();

  for (const [entityType, group] of groupEntitiesByType(entities).entries()) {
    const names = group.map((e) => e.name);
    try {
      const response = await esClient.search({
        index: `risk-score.risk-score-${spaceId}`,
        size: 0,
        ignore_unavailable: true,
        allow_no_indices: true,
        query: {
          bool: {
            filter: [
              { terms: { [`${entityType}.name`]: names } },
              { range: { '@timestamp': { gte: 'now-90d', lte: 'now' } } },
            ],
          },
        },
        aggs: {
          by_entity: {
            terms: { field: `${entityType}.name`, size: names.length },
            aggs: {
              scores_over_time: {
                date_histogram: { field: '@timestamp', calendar_interval: 'day' },
                aggs: { avg_score: { avg: { field: `${entityType}.risk.calculated_score_norm` } } },
              },
            },
          },
        },
      });

      const buckets = ((response.aggregations?.by_entity as Record<string, unknown>)?.buckets ??
        []) as Array<{
        key: string;
        scores_over_time: { buckets: Array<{ avg_score: { value: number | null } }> };
      }>;

      for (const bucket of buckets) {
        const scores = bucket.scores_over_time.buckets
          .map((b) => b.avg_score.value)
          .filter((v): v is number => v != null);
        result.set(`${entityType}:${bucket.key}`, scores);
      }
    } catch (error) {
      logger.warn(
        `[${MODULE_ID}] Failed to fetch time-series risk scores for ${entityType}: ${error}`
      );
    }
  }

  return result;
};

// ---------------------------------------------------------------------------
// Escalation detection
//
// dailyScores is oldest → newest. daysBack selects the comparison bucket:
//   daysBack=1  → yesterday's score (last bucket)
//   daysBack=7  → 7 buckets from the end
//   daysBack=90 → oldest bucket in the 90-day window
// ---------------------------------------------------------------------------

interface EscalationInfo {
  readonly delta: number;
  readonly previousScore: number;
}

const detectEscalation = (
  currentScore: number,
  dailyScores: number[],
  daysBack: number,
  deltaThreshold: number
): EscalationInfo | undefined => {
  if (dailyScores.length < daysBack) return undefined;
  const previousScore = dailyScores[dailyScores.length - daysBack];
  if (previousScore == null || Number.isNaN(previousScore)) return undefined;
  const delta = currentScore - previousScore;
  return delta >= deltaThreshold ? { delta, previousScore } : undefined;
};
